package com.alaabna.games;

import android.Manifest;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.AdvertisingOptions;
import com.google.android.gms.nearby.connection.ConnectionInfo;
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback;
import com.google.android.gms.nearby.connection.ConnectionResolution;
import com.google.android.gms.nearby.connection.ConnectionsClient;
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo;
import com.google.android.gms.nearby.connection.DiscoveryOptions;
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback;
import com.google.android.gms.nearby.connection.Payload;
import com.google.android.gms.nearby.connection.PayloadCallback;
import com.google.android.gms.nearby.connection.PayloadTransferUpdate;
import com.google.android.gms.nearby.connection.Strategy;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Rooms between phones that are close to each other, without internet.
 * Google Nearby Connections picks Bluetooth or direct Wi-Fi by itself.
 * One phone advertises the room (the hub), the others discover it and connect (star layout).
 * The web side sends and receives small JSON strings, the same messages the online rooms use.
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
    private ConnectionsClient client;
    private final Set<String> connected = new HashSet<>();

    @Override
    public void load() {
        client = Nearby.getConnectionsClient(getContext());
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

    private static String msg(Exception e) {
        String m = e == null ? null : e.getMessage();
        return m == null ? "error" : m;
    }

    private JSObject obj(String id) {
        JSObject o = new JSObject();
        o.put("id", id);
        return o;
    }

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
        call.resolve(r);
    }

    private final PayloadCallback payloadCb = new PayloadCallback() {
        @Override
        public void onPayloadReceived(String id, Payload p) {
            if (p.getType() == Payload.Type.BYTES && p.asBytes() != null) {
                JSObject o = obj(id);
                o.put("data", new String(p.asBytes(), StandardCharsets.UTF_8));
                notifyListeners("message", o);
            }
        }

        @Override
        public void onPayloadTransferUpdate(String id, PayloadTransferUpdate update) {}
    };

    private final ConnectionLifecycleCallback lifeCb = new ConnectionLifecycleCallback() {
        @Override
        public void onConnectionInitiated(String id, ConnectionInfo info) {
            client.acceptConnection(id, payloadCb);
            JSObject o = obj(id);
            o.put("name", info.getEndpointName());
            notifyListeners("initiated", o);
        }

        @Override
        public void onConnectionResult(String id, ConnectionResolution res) {
            JSObject o = obj(id);
            if (res.getStatus().isSuccess()) {
                connected.add(id);
                notifyListeners("connected", o);
            } else {
                o.put("code", res.getStatus().getStatusCode());
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
        String name = call.getString("name", "room");
        AdvertisingOptions opt = new AdvertisingOptions.Builder().setStrategy(Strategy.P2P_STAR).build();
        client.startAdvertising(name, SERVICE_ID, lifeCb, opt)
            .addOnSuccessListener(v -> call.resolve())
            .addOnFailureListener(e -> call.reject(msg(e)));
    }

    @PluginMethod
    public void stopAdvertising(PluginCall call) {
        client.stopAdvertising();
        call.resolve();
    }

    @PluginMethod
    public void discover(PluginCall call) {
        DiscoveryOptions opt = new DiscoveryOptions.Builder().setStrategy(Strategy.P2P_STAR).build();
        client.startDiscovery(SERVICE_ID, discoveryCb, opt)
            .addOnSuccessListener(v -> call.resolve())
            .addOnFailureListener(e -> call.reject(msg(e)));
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        client.stopDiscovery();
        call.resolve();
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String id = call.getString("id");
        String name = call.getString("name", "player");
        if (id == null) {
            call.reject("no id");
            return;
        }
        client.requestConnection(name, id, lifeCb)
            .addOnSuccessListener(v -> call.resolve())
            .addOnFailureListener(e -> call.reject(msg(e)));
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
        client.sendPayload(to, Payload.fromBytes(data.getBytes(StandardCharsets.UTF_8)))
            .addOnSuccessListener(v -> call.resolve())
            .addOnFailureListener(e -> call.reject(msg(e)));
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
