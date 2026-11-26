package com.alaabna.games;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // nearby rooms: plain Bluetooth (BtRoom) is the one the app uses; Nearby stays for a quick way back (transport-near.js)
        registerPlugin(BtRoomPlugin.class);
        registerPlugin(NearbyPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
