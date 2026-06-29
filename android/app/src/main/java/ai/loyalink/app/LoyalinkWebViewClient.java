package ai.loyalink.app;

import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Hardens WebView failure handling on top of Capacitor's defaults.
 *
 * The app loads my.loyalink.ai remotely (see capacitor.config.ts `server.url`),
 * so it depends on the network at every launch. When DNS/connectivity fails the
 * WebView would otherwise show Android's raw "Webpage not available" page
 * (e.g. ERR_NAME_NOT_RESOLVED). Capacitor already swaps in our branded
 * error.html on main-frame load errors, but only inside super.onReceivedError;
 * we re-assert it here so the branded screen fires regardless of any future
 * change to Capacitor internals. The error page is a bundled local asset, so it
 * always loads without network.
 *
 * We also recover from the render process being killed (a background memory
 * reclaim), which Capacitor leaves unhandled (returns false) and which
 * otherwise leaves a blank/dead WebView — another "can't open the app".
 */
public class LoyalinkWebViewClient extends BridgeWebViewClient {

    private final Bridge bridge;

    public LoyalinkWebViewClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        super.onReceivedError(view, request, error);
        forceBrandedErrorPage(view, request);
    }

    @Override
    public void onReceivedHttpError(
        WebView view,
        WebResourceRequest request,
        android.webkit.WebResourceResponse errorResponse
    ) {
        super.onReceivedHttpError(view, request, errorResponse);
        forceBrandedErrorPage(view, request);
    }

    /**
     * Guarantee the branded local error page is showing after a main-frame load
     * failure. No-op if Capacitor already navigated there (avoids a reload loop).
     */
    private void forceBrandedErrorPage(WebView view, WebResourceRequest request) {
        if (request == null || !request.isForMainFrame()) {
            return;
        }
        String errorUrl = bridge.getErrorUrl();
        if (errorUrl == null) {
            return;
        }
        String current = view.getUrl();
        if (current == null || !current.equals(errorUrl)) {
            view.loadUrl(errorUrl);
        }
    }

    @Override
    public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
        // Let listeners observe first, but we take ownership of recovery.
        super.onRenderProcessGone(view, detail);

        if (bridge == null || bridge.getWebView() != view) {
            return false;
        }

        // Reloading triggers a fresh render process instead of a dead view.
        String target = bridge.getServerUrl();
        if (target == null) {
            target = bridge.getAppUrl();
        }
        if (target != null) {
            view.loadUrl(target);
        }
        return true;
    }
}
