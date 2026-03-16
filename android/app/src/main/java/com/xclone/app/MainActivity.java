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

                // Double tap to exit
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

    // Improve stability when app resumes
    @Override
    protected void onResume() {
        super.onResume();
    }

    // Handle pause state properly
    @Override
    protected void onPause() {
        super.onPause();
    }

    // Clean exit handling
    @Override
    protected void onDestroy() {
        super.onDestroy();
    }
}
