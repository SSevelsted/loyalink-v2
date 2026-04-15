package ai.loyalink.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (bridge != null && bridge.getWebView() != null) {
            // No overscroll glow — matches the iOS no-bounce behavior for a consistent native feel.
            bridge.getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
            // Prevent the flash of white between splash and first web paint.
            bridge.getWebView().setBackgroundColor(Color.parseColor("#09090b"));
        }
    }
}
