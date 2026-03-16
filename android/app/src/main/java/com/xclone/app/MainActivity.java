package com.xclone.app;

import android.os.Bundle;
import android.view.KeyEvent;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private long lastBackPressed = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    // Handle Android back button navigation
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {

        if (keyCode == KeyEvent.KEYCODE_BACK) {

            if (this.bridge.getWebView().canGoBack()) {
                this.bridge.getWebView().goBack();
                return true;
            } else {

                if (lastBackPressed + 2000 > System.currentTimeMillis()) {
                    finish();
                    return true;
                } else {
                    Toast.makeText(this, "Press back again to exit", Toast.LENGTH_SHORT).show();
                    lastBackPressed = System.currentTimeMillis();
                    return true;
                }
            }
        }

        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onResume() {
        super.onResume();
    }

    @Override
    public void onPause() {
        super.onPause();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
    }
}
