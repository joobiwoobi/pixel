!r.placeModule("init", function(e) {
    function M(e) {
        var t = requestAnimationFrame(function n() {
            e(), t = requestAnimationFrame(n)
        });
        return function() {
            cancelAnimationFrame(t)
        }
    }
    var t = e("jQuery"),
        n = e("r"),
        r = e("activity"),
        i = e("audio"),
        s = e("utils").bindEvents,
        o = e("camera"),
        u = e("camerabutton"),
        a = e("camerabuttonevents"),
        f = e("cameraevents"),
        l = e("canvasevents"),
        c = e("canvasse"),
        h = e("client"),
        p = e("coordinates"),
        d = e("cursor"),
        v = e("hand"),
        m = e("inspector"),
        g = e("keyboard"),
        y = e("mollyguard"),
        b = e("mutebutton"),
        w = e("mutebuttonevents"),
        E = e("notifications"),
        S = e("palette"),
        x = e("paletteevents"),
        T = e("api"),
        N = e("timer"),
        C = e("websocketevents"),
        k = e("zoombutton"),
        L = e("zoombuttonevents"),
        A = e("notificationbutton"),
        O = e("notificationbuttonevents");
    t(function() {
        function it() {
            t(q).css({
                height: window.innerHeight,
                width: window.innerWidth
            })
        }

        function Tt() {
            var e = q.getBoundingClientRect();
            yt.width = e.width, yt.height = e.height, bt.mozImageSmoothingEnabled = !1, bt.webkitImageSmoothingEnabled = !1, bt.msImageSmoothingEnabled = !1, bt.imageSmoothingEnabled = !1, Nt()
        }

        function Nt() {
            bt.clearRect(0, 0, yt.width, yt.height), bt.drawImage(c.el, yt.width / 2 + (h._panX - at - .5) * h._zoom, yt.height / 2 + (h._panY - ft - .5) * h._zoom, c.width * h._zoom, c.height * h._zoom)
        }

        function Ht(e) {
            return e.target !== z && e.relatedTarget !== z && d.isDown
        }
        var e = n.config.place_active_visitors,
            _ = n.config.place_fullscreen,
            D = !0,
            P = !1,
            H = n.config.place_canvas_width,
            B = n.config.place_canvas_height,
            j = 1e3 * n.config.place_cooldown,
            F = n.config.place_websocket_url,
            I = n.config.place_wait_seconds,
            q = document.getElementById("place-container");
        if (!q) return;
        var R = document.getElementById("place-activity-count"),
            U = document.getElementById("place-viewer"),
            z = document.getElementById("place-camera"),
            W = document.getElementById("place-camera-button"),
            X = document.getElementById("place-canvasse"),
            V = document.getElementById("place-coordinates"),
            J = document.getElementById("place-palette"),
            K = document.getElementById("place-hand"),
            Q = document.getElementById("place-hand-cursor"),
            G = document.getElementById("place-hand-swatch"),
            Y = document.getElementById("place-inspector"),
            Z = document.getElementById("place-molly-guard"),
            et = document.getElementById("place-mute-button"),
            tt = document.getElementById("place-zoom-button"),
            nt = document.getElementById("place-notification-button"),
            rt = document.getElementById("place-timer");
        _ && (it(), t(window).on("resize", it)), r.init(R, e), i.init(), o.init(U, z), t(U).css({
            flex: "0 0 " + H + "px"
        });
        var st = window.location.hash.replace(/^#/, ""),
            ot = n.utils.parseQueryString(st);
        c.init(X, H, B), u.init(W), u.enable(), v.init(K, G, Q), m.init(Y), n.config.logged && g.init();
        var ut = window.navigator.userAgent.indexOf("AppleWebKit") > -1 && window.innerHeight > 200;
        ut && A.init(nt), P && !D && S.init(J), D || (y.init(Z), i.isSupported && b.init(et), k.init(tt)), N.init(rt), E.init();
        var at = H / 2,
            ft = B / 2,
            lt = parseInt(H / 10),
            ct = lt + parseInt(Math.random() * (H - lt * 2), 10),
            ht = lt + parseInt(Math.random() * (B - lt * 2), 10),
            pt = Math.max(0, Math.min(H, ot.x || ct)),
            dt = Math.max(0, Math.min(B, ot.y || ht));
        p.init(V, pt, dt);
        var vt = h.getOffsetFromCameraLocation(pt, dt);
        h.init(P, j, vt.x, vt.y), P ? h.setCooldownTime(I * 1e3) : h.setCooldownTime(0);
        var mt = q.getBoundingClientRect();
        h.setContainerSize(mt.width, mt.height), t(window).on("resize", function() {
            var e = q.getBoundingClientRect();
            h.setContainerSize(e.width, e.height)
        });
        var gt = null,
            yt = null,
            bt = null,
            wt = !1,
            Et = window.navigator.userAgent.indexOf("Safari") > -1 && window.navigator.userAgent.indexOf("Chrome") === -1,
            St = window.navigator.userAgent.indexOf("iOS") > -1 || window.navigator.userAgent.indexOf("iPhone") > -1 || window.navigator.userAgent.indexOf("iPad") > -1,
            xt = window.navigator.userAgent.indexOf("Edge") > -1;
        if (Et || St || xt) wt = !0, t(c.el).css({
            opacity: 0
        }), yt = document.createElement("canvas"), bt = yt.getContext("2d"), t(yt).addClass("place-display-canvas"), t(q).prepend(yt), Tt(), s(window, {
            resize: function() {
                Tt()
            }
        });
        var Ct = pt - 2,
            kt = 5,
            Lt = 1,
            At = 0,
            Ot = dt,
            Mt = 0,
            _t = 10,
            Dt = M(function() {
                Mt = (Mt + 1) % _t;
                if (Mt) return;
                c.drawRectToDisplay(Ct, Ot, kt, 1, "grey"), At = (At + Lt) % kt, c.drawTileToDisplay(Ct + At, Ot, "black")
            });
        T.getCanvasBitmapState().then(function(e, t) {
            if (!t) return;
            Dt(), c.clearRectFromDisplay(Ct, Ot, kt, 1), h.setInitialState(t), wt && Nt(), h.isZoomedIn && h.toggleZoom()
        });
        var Pt = new n.WebSocket(F);
        Pt.on(C), Pt.start(), s(q, f.container), s(document, f.document), s(z, l), s(W, a), s(et, w), s(tt, L), s(nt, O), P && s(J, x), s(q, {
            mouseout: function(e) {
                if (Ht(e)) return f.container.mouseup(e)
            },
            touchstart: function(e) {
                return d.isUsingTouch || d.setTouchMode(!0), f.container.mousedown(e.changedTouches[0])
            },
            touchmove: function(e) {
                return e.preventDefault(), f.container.mousemove(e.changedTouches[0])
            },
            touchend: function(e) {
                return f.container.mouseup(e.changedTouches[0])
            },
            touchcancel: function(e) {
                if (Ht(e)) return f.container.mouseup(e.changedTouches[0])
            }
        }), s(J, {
            touchstart: function(e) {
                d.isUsingTouch || d.setTouchMode(!0)
            }
        }), s(window, {
            hashchange: function(e) {
                var t = window.location.hash.replace(/^#/, ""),
                    r = n.utils.parseQueryString(t);
                r.x && r.y && (h.interact(), h.setCameraLocation(r.x, r.y))
            }
        }), M(function() {
            g.tick(), h.tick(), d.tick();
            var e = o.tick(),
                t = c.tick();
            wt && (e || t) && Nt()
        }), n.place = h, window.addEventListener("message", function(e) {
            if (e.origin == "https://www.reddit.com") {
                try {
                    var t = JSON.parse(e.data)
                } catch (e) {
                    return
                }
                t.name == "PLACE_MESSAGE" && t.payload && (T.injectHeaders(t.payload), P || (S.init(J), S.generateSwatches(h.DEFAULT_COLOR_PALETTE), h.enable(), s(J, x)))
            }
        }), n.hooks.call("place.init")
    })
});