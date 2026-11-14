package com.alaabna.games;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.AdvertisingOptions;
import com.google.android.gms.nearby.connection.ConnectionInfo;
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback;
import com.google.android.gms.nearby.connection.ConnectionOptions;
import com.google.android.gms.nearby.connection.ConnectionType;
import com.google.android.gms.nearby.connection.ConnectionResolution;
import com.google.android.gms.nearby.connection.ConnectionsClient;
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes;
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo;
import com.google.android.gms.nearby.connection.DiscoveryOptions;
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback;
import com.google.android.gms.nearby.connection.Payload;
import com.google.android.gms.nearby.connection.PayloadCallback;
import com.google.android.gms.nearby.connection.PayloadTransferUpdate;
import com.google.android.gms.nearby.connection.Strategy;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rooms between phones that are close to each other, without internet.
 * Google Nearby Connections picks Bluetooth or direct Wi-Fi by itself.
 * One phone advertises the room (the hub), the others discover it and connect (star layout, P2P_STAR on both sides).
 * Both sides accept every connection (onConnectionInitiated), then send small JSON strings, the same messages the online rooms use.
 *
 * Permissions follow developers.google.com/nearby/connections/android/get-started:
 * Android 7-11 location, Android 12 Bluetooth (nearby devices) and precise location, Android 13+ Bluetooth and nearby Wi-Fi.
 */
@CapacitorPlugin(
    name = "Nearby",
    permissions = {
        @Permission(alias = "loc", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "bt", strings = { "android.permission.BLUETOOTH_SCAN", "android.permission.BLUETOOTH_ADVERTISE", "android.permission.BLUETOOTH_CONNECT" }),
        @Permission(alias = "wifi", strings = { "android.permission.NEARBY_WIFI_DEVICES" })
    }
)
public class NearbyPlugin extends Plugin {
    private static final String SERVICE_ID = "com.alaabna.games.near";
    private static final Strategy STRATEGY = Strategy.P2P_STAR;
    // the JS side cuts bigger messages into pieces; older Play services took at most 32 KB in one BYTES payload
    private static final int MAX_BYTES = 32768;
    private ConnectionsClient client;
    // touched from the plugin thread (send) and the main thread (Nearby callbacks)
    private final Set<String> connected = Collections.newSetFromMap(new ConcurrentHashMap<String, Boolean>());

    @Override
    public void load() {
        client = Nearby.getConnectionsClient(getContext());
    }

    @Override
    protected void handleOnDestroy() {
        // the app is closing: let the other phones know at once instead of after a timeout
        try {
            client.stopAdvertising();
            client.stopDiscovery();
            client.stopAllEndpoints();
        } catch (Throwable t) {}
        connected.clear();
    }

    private String[] aliases() {
        int v = Build.VERSION.SDK_INT;
        if (v >= 33) return new String[] { "bt", "wifi" };
        if (v >= 31) return new String[] { "bt", "loc" };
        return new String[] { "loc" };
    }

    private boolean allGranted() {
        for (String a : aliases()) {
            if (getPermissionState(a) != PermissionState.GRANTED) return false;
        }
        return true;
    }

    /** Android 12 lets the player share only approximate location, but nearby rooms there need the precise one. */
    private boolean coarseOnly() {
        int v = Build.VERSION.SDK_INT;
        if (v < 31 || v >= 33) return false;
        Context c = getContext();
        return c.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
            && c.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED;
    }

    private static int code(Exception e) {
        return e instanceof ApiException ? ((ApiException) e).getStatusCode() : -1;
    }

    /** "8034 MISSING_PERMISSION_ACCESS_COARSE_LOCATION": the status name, which the app turns into a short hint. */
    private static String msg(Exception e) {
        if (e instanceof ApiException) {
            int c = ((ApiException) e).getStatusCode();
            String s = null;
            try {
                s = ConnectionsStatusCodes.getStatusCodeString(c);
            } catch (Throwable t) {}
            return c + " " + (s == null ? "" : s);
        }
        String m = e == null ? null : e.getMessage();
        return m == null ? "error" : m;
    }

    private static void fail(PluginCall call, Exception e) {
        call.reject(msg(e), String.valueOf(code(e)));
    }

    private static String nonEmpty(String s, String d) {
        return s == null || s.trim().isEmpty() ? d : s;
    }

    private JSObject obj(String id) {
        JSObject o = new JSObject();
        o.put("id", id);
        return o;
    }

    private int gmsCode() {
        try {
            return GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(getContext());
        } catch (Throwable t) {
            return ConnectionResult.SERVICE_MISSING;
        }
    }

    /** Nearby lives in Google Play services: a phone without them (some Huawei) gets a clear answer instead of a silent failure. */
    private boolean gmsOk(PluginCall call) {
        int g = gmsCode();
        if (g == ConnectionResult.SUCCESS) return true;
        String s = "";
        try {
            s = GoogleApiAvailability.getInstance().getErrorString(g);
        } catch (Throwable t) {}
        call.reject("SERVICE_MISSING " + g + " " + s, "gms");
        return false;
    }

    private BluetoothAdapter adapter() {
        try {
            BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
            return bm == null ? null : bm.getAdapter();
        } catch (Throwable t) {
            return null;
        }
    }

    /** What the phone has ready for nearby rooms, so the app can tell the player what to turn on. */
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("sdk", Build.VERSION.SDK_INT);
        int g = gmsCode();
        r.put("gms", g);
        r.put("gmsOk", g == ConnectionResult.SUCCESS);
        boolean fix = false;
        try {
            fix = g != ConnectionResult.SUCCESS && GoogleApiAvailability.getInstance().isUserResolvableError(g);
        } catch (Throwable t) {}
        r.put("gmsFix", fix);
        boolean loc = true;
        try {
            LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            if (lm != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) loc = lm.isLocationEnabled();
                else loc = lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
            }
        } catch (Throwable t) {}
        r.put("loc", loc);
        // Android 13 and newer find nearby phones without location
        r.put("locNeeded", Build.VERSION.SDK_INT < 33);
        BluetoothAdapter a = adapter();
        boolean on = true;
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
        r.put("coarseOnly", coarseOnly());
        call.resolve(r);
    }

    /** Opens what the player needs: the "turn Bluetooth on" question, location settings, this app's permissions, or a Google services update. */
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void settings(PluginCall call) {
        String which = call.getString("which", "app");
        Activity act = getActivity();
        if ("gms".equals(which) && act != null) {
            act.runOnUiThread(() -> {
                try {
                    GoogleApiAvailability.getInstance().makeGooglePlayServicesAvailable(act);
                } catch (Throwable t) {}
            });
            call.resolve();
            return;
        }
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
            call.reject(msg(e));
        }
    }

    /** Asks for the permissions this Android version needs (once refused for good, Android answers at once and the app offers its settings page). */
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
        r.put("coarseOnly", coarseOnly());
        call.resolve(r);
    }

    private final PayloadCallback payloadCb = new PayloadCallback() {
        @Override
        public void onPayloadReceived(String id, Payload p) {
            if (p.getType() != Payload.Type.BYTES) return;
            byte[] b = p.asBytes();
            if (b == null) return;
            JSObject o = obj(id);
            o.put("data", new String(b, StandardCharsets.UTF_8));
            notifyListeners("message", o);
        }

        @Override
        public void onPayloadTransferUpdate(String id, PayloadTransferUpdate update) {}
    };

    /** Used by both sides: the hub for phones that ask to join, the joining phone for its own request. Both must accept. */
    private final ConnectionLifecycleCallback lifeCb = new ConnectionLifecycleCallback() {
        @Override
        public void onConnectionInitiated(String id, ConnectionInfo info) {
            JSObject o = obj(id);
            o.put("name", info.getEndpointName());
            notifyListeners("initiated", o);
            client.acceptConnection(id, payloadCb).addOnFailureListener(e -> {
                JSObject f = obj(id);
                f.put("code", code(e));
                f.put("msg", msg(e));
                notifyListeners("failed", f);
            });
        }

        @Override
        public void onConnectionResult(String id, ConnectionResolution res) {
            JSObject o = obj(id);
            if (res.getStatus().isSuccess()) {
                connected.add(id);
                notifyListeners("connected", o);
            } else {
                int c = res.getStatus().getStatusCode();
                o.put("code", c);
                String s = null;
                try {
                    s = ConnectionsStatusCodes.getStatusCodeString(c);
                } catch (Throwable t) {}
                o.put("msg", c + " " + (s == null ? "" : s));
                notifyListeners("failed", o);
            }
        }

        @Override
        public void onDisconnected(String id) {
            connected.remove(id);
            notifyListeners("disconnected", obj(id));
        }
    };

    private final EndpointDiscoveryCallback discoveryCb = new EndpointDiscoveryCallback() {
        @Override
        public void onEndpointFound(String id, DiscoveredEndpointInfo info) {
            if (!SERVICE_ID.equals(info.getServiceId())) return;
            JSObject o = obj(id);
            o.put("name", info.getEndpointName());
            notifyListeners("found", o);
        }

        @Override
        public void onEndpointLost(String id) {
            notifyListeners("lost", obj(id));
        }
    };

    @PluginMethod
    public void advertise(PluginCall call) {
        if (!gmsOk(call)) return;
        String name = nonEmpty(call.getString("name"), "room");
        // small game messages only: stay on Bluetooth and never switch the phone's Wi-Fi on or off
        AdvertisingOptions opt = new AdvertisingOptions.Builder()
            .setStrategy(STRATEGY)
            .setConnectionType(ConnectionType.NON_DISRUPTIVE)
            .build();
        client.stopAdvertising();
        client.startAdvertising(name, SERVICE_ID, lifeCb, opt)
            .addOnSuccessListener(v -> call.resolve())
            .addOnFailureListener(e -> fail(call, e));
    }

    @PluginMethod
    public void stopAdvertising(PluginCall call) {
        client.stopAdvertising();
        call.resolve();
    }

    @PluginMethod
    public void discover(PluginCall call) {
        if (!gmsOk(call)) return;
        DiscoveryOptions opt = new DiscoveryOptions.Builder().setStrategy(STRATEGY).build();
        client.stopDiscovery();
        client.startDiscovery(SERVICE_ID, discoveryCb, opt)
            .addOnSuccessListener(v -> call.resolve())
            .addOnFailureListener(e -> {
                // still looking from an earlier call: that is what was asked
                if (code(e) == ConnectionsStatusCodes.STATUS_ALREADY_DISCOVERING) call.resolve();
                else fail(call, e);
            });
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        client.stopDiscovery();
        call.resolve();
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (!gmsOk(call)) return;
        String id = call.getString("id");
        String name = nonEmpty(call.getString("name"), "player");
        if (id == null) {
            call.reject("no id");
            return;
        }
        ConnectionOptions opt = new ConnectionOptions.Builder().setConnectionType(ConnectionType.NON_DISRUPTIVE).build();
        client.requestConnection(name, id, lifeCb, opt)
            .addOnSuccessListener(v -> call.resolve())
            .addOnFailureListener(e -> {
                // a link the app no longer uses is still open: close it, so the next try starts a fresh one (and gets the room's hello)
                if (code(e) == ConnectionsStatusCodes.STATUS_ALREADY_CONNECTED_TO_ENDPOINT) {
                    client.disconnectFromEndpoint(id);
                    connected.remove(id);
                }
                fail(call, e);
            });
    }

    @PluginMethod
    public void send(PluginCall call) {
        String data = call.getString("data", "");
        JSArray ids = call.getArray("ids");
        List<String> to = new ArrayList<>();
        try {
            if (ids != null && ids.length() > 0) {
                for (int i = 0; i < ids.length(); i++) to.add(ids.getString(i));
            } else {
                to.addAll(connected);
            }
        } catch (Exception e) {
            call.reject(msg(e));
            return;
        }
        to.retainAll(connected);
        if (to.isEmpty()) {
            call.resolve();
            return;
        }
        byte[] b = data.getBytes(StandardCharsets.UTF_8);
        if (b.length > MAX_BYTES) {
            call.reject("too big " + b.length);
            return;
        }
        client.sendPayload(to, Payload.fromBytes(b))
            .addOnSuccessListener(v -> call.resolve())
            .addOnFailureListener(e -> fail(call, e));
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        String id = call.getString("id");
        if (id != null) {
            client.disconnectFromEndpoint(id);
            connected.remove(id);
        }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        client.stopAdvertising();
        client.stopDiscovery();
        client.stopAllEndpoints();
        connected.clear();
        call.resolve();
    }
}
