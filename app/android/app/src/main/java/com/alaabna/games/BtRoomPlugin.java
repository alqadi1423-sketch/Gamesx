package com.alaabna.games;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Rooms between phones close to each other over plain Bluetooth: no internet, no Wi-Fi, no Google services.
 *
 * The phone that opens the room (the hub) shows itself to nearby phones (Android asks the player once),
 * puts the room in its Bluetooth name ("A1|CODE|name", the old name comes back when the room closes)
 * and listens on one RFCOMM service. The others look for nearby phones, list the names that are rooms,
 * and connect to the hub; after a cut they connect straight to the same address, no search needed.
 *
 * Messages are UTF-8 JSON text, each sent as a 4-byte length and the bytes, the same messages the online rooms use.
 * The calls and events match NearbyPlugin (found, lost, connected, failed, disconnected, message),
 * so public/js/transport-near.js drives either one; "visible" also tells whether the hub can still be found.
 *
 * Permissions: Android 12 and newer ask for "nearby devices" only (scan, advertise, connect);
 * Android 7-11 need location to find phones, with location switched on.
 */
@CapacitorPlugin(
    name = "BtRoom",
    permissions = {
        @Permission(alias = "loc", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "bt", strings = { "android.permission.BLUETOOTH_SCAN", "android.permission.BLUETOOTH_ADVERTISE", "android.permission.BLUETOOTH_CONNECT" })
    }
)
public class BtRoomPlugin extends Plugin {
    // fixed for good: older and newer app versions must find each other's rooms
    private static final UUID SERVICE = UUID.fromString("5f3c2a8e-9d41-4b7a-a3c6-0e8b1d27f4a1");
    private static final String SDP_NAME = "alaabna-room";
    private static final String ROOM_PREFIX = "A1|";
    private static final int MAX_FRAME = 4 * 1024 * 1024;
    // how long the hub asks to stay findable (Android may give less; "visible" says when it ends)
    private static final int SHOW_SECONDS = 3600;
    private static final String PREFS = "btroom", KEY_NAME = "origName";

    private final class Conn {
        final String id;
        final BluetoothSocket sock;
        final DataOutputStream out;
        final ExecutorService writer = Executors.newSingleThreadExecutor();
        volatile boolean open = true;

        Conn(String id, BluetoothSocket sock) throws IOException {
            this.id = id;
            this.sock = sock;
            this.out = new DataOutputStream(new BufferedOutputStream(sock.getOutputStream()));
        }
    }

    private final Map<String, Conn> conns = new ConcurrentHashMap<>();
    // phones seen as rooms: address -> name; and the ones seen in the current search round
    private final Map<String, String> seen = new ConcurrentHashMap<>();
    private final Set<String> round = ConcurrentHashMap.newKeySet();
    private volatile BluetoothServerSocket server;
    private volatile boolean searching = false;
    private volatile boolean hosting = false;
    private BroadcastReceiver receiver;

    @Override
    public void load() {
        IntentFilter f = new IntentFilter();
        f.addAction(BluetoothDevice.ACTION_FOUND);
        f.addAction(BluetoothDevice.ACTION_NAME_CHANGED);
        f.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        f.addAction(BluetoothAdapter.ACTION_SCAN_MODE_CHANGED);
        f.addAction(BluetoothAdapter.ACTION_STATE_CHANGED);
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context c, Intent i) {
                try {
                    onBroadcast(i);
                } catch (Throwable t) {}
            }
        };
        // system broadcasts only; exported so every Android version delivers them
        ContextCompat.registerReceiver(getContext(), receiver, f, ContextCompat.RECEIVER_EXPORTED);
        // a room left open by an app that was killed: give the phone its own name back
        restoreName();
    }

    @Override
    protected void handleOnDestroy() {
        stopAll();
        try {
            getContext().unregisterReceiver(receiver);
        } catch (Throwable t) {}
    }

    /* ---------- the phone's state ---------- */

    private BluetoothAdapter adapter() {
        try {
            BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
            return bm == null ? null : bm.getAdapter();
        } catch (Throwable t) {
            return null;
        }
    }

    private String[] aliases() {
        return Build.VERSION.SDK_INT >= 31 ? new String[] { "bt" } : new String[] { "loc" };
    }

    private boolean allGranted() {
        for (String a : aliases()) {
            if (getPermissionState(a) != PermissionState.GRANTED) return false;
        }
        return true;
    }

    private boolean locationOn() {
        try {
            LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) return true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) return lm.isLocationEnabled();
            return lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Throwable t) {
            return true;
        }
    }

    @SuppressLint("MissingPermission")
    private boolean visibleNow() {
        BluetoothAdapter a = adapter();
        try {
            return a != null && a.getScanMode() == BluetoothAdapter.SCAN_MODE_CONNECTABLE_DISCOVERABLE;
        } catch (Throwable t) {
            return false;
        }
    }

    /** Before any radio call: the reason it cannot run, in words the app turns into a hint (core.js nearErr), or null. */
    @SuppressLint("MissingPermission")
    private String notReady(boolean search) {
        BluetoothAdapter a = adapter();
        if (a == null) return "NO_BLUETOOTH";
        if (!allGranted()) return "MISSING_PERMISSION";
        boolean on;
        try {
            on = a.isEnabled();
        } catch (Throwable t) {
            on = false;
        }
        if (!on) return "BLUETOOTH_OFF";
        if (search && Build.VERSION.SDK_INT < 31 && !locationOn()) return "LOCATION_OFF";
        return null;
    }

    private JSObject obj(String id) {
        JSObject o = new JSObject();
        o.put("id", id);
        return o;
    }

    /** What the phone has ready, in the same shape as NearbyPlugin.status (Google services are not needed here). */
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("sdk", Build.VERSION.SDK_INT);
        r.put("via", "bt");
        r.put("gmsOk", true);
        r.put("loc", locationOn());
        r.put("locNeeded", Build.VERSION.SDK_INT < 31);
        BluetoothAdapter a = adapter();
        boolean on = false;
        try {
            on = a != null && a.isEnabled();
        } catch (Throwable t) {}
        boolean has = a != null;
        try {
            has = has || getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH);
        } catch (Throwable t) {}
        r.put("hasBt", has);
        r.put("bt", on);
        r.put("perm", allGranted());
        r.put("coarseOnly", false);
        r.put("visible", visibleNow());
        call.resolve(r);
    }

    /** Opens what the player needs: the "turn Bluetooth on" question, location settings, or this app's permissions. */
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void settings(PluginCall call) {
        String which = call.getString("which", "app");
        Activity act = getActivity();
        if ("bt".equals(which) && act != null) {
            BluetoothAdapter a = adapter();
            boolean may = Build.VERSION.SDK_INT < 31
                || getContext().checkSelfPermission("android.permission.BLUETOOTH_CONNECT") == PackageManager.PERMISSION_GRANTED;
            if (a != null && may) {
                try {
                    if (!a.isEnabled()) {
                        act.startActivity(new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE));
                        call.resolve();
                        return;
                    }
                } catch (Throwable t) {}
            }
        }
        Intent i;
        if ("loc".equals(which)) i = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
        else if ("bt".equals(which)) i = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
        else {
            i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            i.setData(Uri.fromParts("package", getContext().getPackageName(), null));
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    /** Asks for the permissions this Android version needs (once refused for good, Android answers at once). */
    @PluginMethod
    public void ensure(PluginCall call) {
        if (allGranted()) {
            JSObject r = new JSObject();
            r.put("granted", true);
            call.resolve(r);
            return;
        }
        requestPermissionForAliases(aliases(), call, "permsDone");
    }

    @PermissionCallback
    private void permsDone(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", allGranted());
        r.put("coarseOnly", false);
        call.resolve(r);
    }

    /* ---------- the phone's Bluetooth name carries the room ---------- */

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @SuppressLint("MissingPermission")
    private boolean setRoomName(String name) {
        BluetoothAdapter a = adapter();
        if (a == null) return false;
        try {
            SharedPreferences p = prefs();
            // keep the phone's own name once, even when a second room opens before the first one gave it back
            if (!p.contains(KEY_NAME)) {
                String mine = a.getName();
                if (mine != null && !mine.startsWith(ROOM_PREFIX)) p.edit().putString(KEY_NAME, mine).apply();
            }
            return a.setName(name);
        } catch (Throwable t) {
            return false;
        }
    }

    @SuppressLint("MissingPermission")
    private void restoreName() {
        try {
            SharedPreferences p = prefs();
            String mine = p.getString(KEY_NAME, null);
            if (mine == null) return;
            BluetoothAdapter a = adapter();
            if (a == null || !a.isEnabled()) return;
            if (a.setName(mine)) p.edit().remove(KEY_NAME).apply();
        } catch (Throwable t) {}
    }

    /* ---------- events from the system ---------- */

    @SuppressWarnings("deprecation")
    @SuppressLint("MissingPermission")
    private void onBroadcast(Intent i) {
        String act = i.getAction();
        if (BluetoothDevice.ACTION_FOUND.equals(act) || BluetoothDevice.ACTION_NAME_CHANGED.equals(act)) {
            BluetoothDevice d = i.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
            if (d == null) return;
            String addr = d.getAddress();
            String name = i.getStringExtra(BluetoothDevice.EXTRA_NAME);
            if (name == null) {
                try {
                    name = d.getName();
                } catch (Throwable t) {}
            }
            if (name != null && name.startsWith(ROOM_PREFIX)) {
                round.add(addr);
                String was = seen.put(addr, name);
                if (!name.equals(was)) {
                    JSObject o = obj(addr);
                    o.put("name", name);
                    notifyListeners("found", o);
                }
            } else if (name != null && seen.remove(addr) != null) {
                // the room closed and the phone took its own name back
                notifyListeners("lost", obj(addr));
            }
        } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(act)) {
            // a search round lasts about 12 s: rooms not seen in it are gone; then look again while asked to
            for (String addr : new ArrayList<>(seen.keySet())) {
                if (!round.contains(addr) && !conns.containsKey(addr)) {
                    seen.remove(addr);
                    notifyListeners("lost", obj(addr));
                }
            }
            round.clear();
            if (searching) {
                BluetoothAdapter a = adapter();
                try {
                    if (a != null && a.isEnabled() && !a.isDiscovering()) a.startDiscovery();
                } catch (Throwable t) {}
            }
        } else if (BluetoothAdapter.ACTION_SCAN_MODE_CHANGED.equals(act)) {
            int m = i.getIntExtra(BluetoothAdapter.EXTRA_SCAN_MODE, -1);
            JSObject o = new JSObject();
            o.put("on", m == BluetoothAdapter.SCAN_MODE_CONNECTABLE_DISCOVERABLE);
            notifyListeners("visible", o);
        } else if (BluetoothAdapter.ACTION_STATE_CHANGED.equals(act)) {
            int s = i.getIntExtra(BluetoothAdapter.EXTRA_STATE, -1);
            if (s == BluetoothAdapter.STATE_TURNING_OFF || s == BluetoothAdapter.STATE_OFF) {
                for (Conn c : new ArrayList<>(conns.values())) close(c, true);
                closeServer();
            } else if (s == BluetoothAdapter.STATE_ON && !hosting) {
                restoreName();
            }
        }
    }

    /* ---------- the hub ---------- */

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void advertise(PluginCall call) {
        String why = notReady(false);
        if (why != null) {
            call.reject(why, why);
            return;
        }
        String name = call.getString("name", "room");
        if (name == null || !name.startsWith(ROOM_PREFIX)) name = ROOM_PREFIX + name;
        BluetoothAdapter a = adapter();
        try {
            a.cancelDiscovery();
        } catch (Throwable t) {}
        searching = false;
        closeServer();
        try {
            server = a.listenUsingInsecureRfcommWithServiceRecord(SDP_NAME, SERVICE);
        } catch (Throwable t) {
            call.reject("LISTEN_FAILED " + t.getMessage(), "listen");
            return;
        }
        hosting = true;
        final BluetoothServerSocket ss = server;
        Thread acc = new Thread(() -> {
            while (server == ss) {
                try {
                    BluetoothSocket s = ss.accept();
                    if (s != null) open(s);
                } catch (IOException e) {
                    break;
                }
            }
        }, "btroom-accept");
        acc.setDaemon(true);
        acc.start();
        if (!setRoomName(name)) {
            stopHub();
            call.reject("ROOM_NAME_FAILED", "name");
            return;
        }
        if (visibleNow()) {
            JSObject r = new JSObject();
            r.put("visible", true);
            call.resolve(r);
            return;
        }
        askVisible(call, "advertised");
    }

    /** Android's own question: "let nearby devices see this phone". The answer comes to the callback. */
    private void askVisible(PluginCall call, String cb) {
        Intent i = new Intent(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);
        i.putExtra(BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION, SHOW_SECONDS);
        try {
            startActivityForResult(call, i, cb);
        } catch (Throwable t) {
            call.reject("DISCOVERABLE_FAILED " + t.getMessage(), "visible");
        }
    }

    @ActivityCallback
    private void advertised(PluginCall call, ActivityResult res) {
        if (call == null) return;
        if (res.getResultCode() == Activity.RESULT_CANCELED) {
            stopHub();
            call.reject("DISCOVERABLE_REFUSED", "refused");
            return;
        }
        JSObject r = new JSObject();
        r.put("visible", true);
        call.resolve(r);
    }

    /** The hub shows itself again (Android ends it after a while); a refusal keeps the room as it is. */
    @PluginMethod
    public void show(PluginCall call) {
        if (visibleNow()) {
            JSObject r = new JSObject();
            r.put("visible", true);
            call.resolve(r);
            return;
        }
        String why = notReady(false);
        if (why != null) {
            call.reject(why, why);
            return;
        }
        askVisible(call, "shown");
    }

    @ActivityCallback
    private void shown(PluginCall call, ActivityResult res) {
        if (call == null) return;
        JSObject r = new JSObject();
        r.put("visible", res.getResultCode() != Activity.RESULT_CANCELED);
        call.resolve(r);
    }

    @PluginMethod
    public void visible(PluginCall call) {
        JSObject r = new JSObject();
        r.put("visible", visibleNow());
        call.resolve(r);
    }

    private void closeServer() {
        BluetoothServerSocket s = server;
        server = null;
        if (s != null) {
            try {
                s.close();
            } catch (Throwable t) {}
        }
    }

    /** No new players; the ones already in stay connected. */
    private void stopHub() {
        closeServer();
        hosting = false;
        restoreName();
    }

    @PluginMethod
    public void stopAdvertising(PluginCall call) {
        stopHub();
        call.resolve();
    }

    /* ---------- looking for rooms ---------- */

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void discover(PluginCall call) {
        String why = notReady(true);
        if (why != null) {
            call.reject(why, why);
            return;
        }
        searching = true;
        BluetoothAdapter a = adapter();
        // a fresh look (after a cut or a failed try) hears again about the rooms of this round
        for (Map.Entry<String, String> e : seen.entrySet()) {
            JSObject o = obj(e.getKey());
            o.put("name", e.getValue());
            notifyListeners("found", o);
        }
        try {
            if (a.isDiscovering() || a.startDiscovery()) {
                call.resolve();
                return;
            }
        } catch (Throwable t) {}
        searching = false;
        call.reject(Build.VERSION.SDK_INT < 31 ? "DISCOVERY_FAILED LOCATION" : "DISCOVERY_FAILED BLUETOOTH", "discover");
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        searching = false;
        try {
            BluetoothAdapter a = adapter();
            if (a != null) a.cancelDiscovery();
        } catch (Throwable t) {}
        call.resolve();
    }

    /* ---------- joining a room ---------- */

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void connect(PluginCall call) {
        String id = call.getString("id");
        if (id == null || !BluetoothAdapter.checkBluetoothAddress(id)) {
            call.reject("no id");
            return;
        }
        String why = notReady(false);
        if (why != null) {
            call.reject(why, why);
            return;
        }
        BluetoothAdapter a = adapter();
        // searching slows a new link down a lot: stop it first
        searching = false;
        try {
            a.cancelDiscovery();
        } catch (Throwable t) {}
        // an old link to the same room is closed, so the next one starts fresh (and gets the room's hello)
        Conn old = conns.get(id);
        if (old != null) close(old, false);
        call.resolve();
        Thread t = new Thread(() -> {
            BluetoothSocket s = null;
            try {
                BluetoothDevice d = a.getRemoteDevice(id);
                s = d.createInsecureRfcommSocketToServiceRecord(SERVICE);
                s.connect();
                open(s);
            } catch (Throwable e) {
                if (s != null) {
                    try {
                        s.close();
                    } catch (Throwable x) {}
                }
                JSObject f = obj(id);
                f.put("code", -1);
                f.put("msg", "CONNECT_FAILED " + e.getMessage());
                notifyListeners("failed", f);
            }
        }, "btroom-connect");
        t.setDaemon(true);
        t.start();
    }

    /* ---------- one open link, either side ---------- */

    private void open(BluetoothSocket s) throws IOException {
        String id = s.getRemoteDevice().getAddress();
        Conn old = conns.get(id);
        if (old != null) close(old, false);
        final Conn c = new Conn(id, s);
        conns.put(id, c);
        notifyListeners("connected", obj(id));
        Thread r = new Thread(() -> {
            try {
                DataInputStream in = new DataInputStream(new BufferedInputStream(s.getInputStream()));
                while (c.open) {
                    int n = in.readInt();
                    if (n < 0 || n > MAX_FRAME) break;
                    byte[] b = new byte[n];
                    in.readFully(b);
                    JSObject o = obj(id);
                    o.put("data", new String(b, StandardCharsets.UTF_8));
                    notifyListeners("message", o);
                }
            } catch (Throwable e) {
                // the other phone left, went out of range, or switched Bluetooth off
            }
            close(c, true);
        }, "btroom-read");
        r.setDaemon(true);
        r.start();
    }

    private void close(Conn c, boolean tell) {
        synchronized (c) {
            if (!c.open) return;
            c.open = false;
        }
        conns.remove(c.id, c);
        try {
            c.sock.close();
        } catch (Throwable t) {}
        c.writer.shutdownNow();
        if (tell) notifyListeners("disconnected", obj(c.id));
    }

    @PluginMethod
    public void send(PluginCall call) {
        String data = call.getString("data", "");
        JSArray ids = call.getArray("ids");
        List<Conn> to = new ArrayList<>();
        try {
            if (ids != null && ids.length() > 0) {
                Set<String> want = new HashSet<>();
                for (int i = 0; i < ids.length(); i++) want.add(ids.getString(i));
                for (String k : want) {
                    Conn c = conns.get(k);
                    if (c != null) to.add(c);
                }
            } else {
                to.addAll(conns.values());
            }
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
            return;
        }
        final byte[] b = data.getBytes(StandardCharsets.UTF_8);
        if (b.length > MAX_FRAME) {
            call.reject("too big " + b.length);
            return;
        }
        // each link writes in order on its own thread, so a slow phone never holds up the others
        for (Conn c : to) {
            try {
                c.writer.execute(() -> {
                    try {
                        c.out.writeInt(b.length);
                        c.out.write(b);
                        c.out.flush();
                    } catch (IOException e) {
                        close(c, true);
                    }
                });
            } catch (Throwable t) {}
        }
        call.resolve();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        String id = call.getString("id");
        Conn c = id == null ? null : conns.get(id);
        if (c != null) close(c, false);
        call.resolve();
    }

    @SuppressLint("MissingPermission")
    private void stopAll() {
        searching = false;
        try {
            BluetoothAdapter a = adapter();
            if (a != null) a.cancelDiscovery();
        } catch (Throwable t) {}
        stopHub();
        for (Conn c : new ArrayList<>(conns.values())) close(c, false);
        seen.clear();
        round.clear();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopAll();
        call.resolve();
    }
}
