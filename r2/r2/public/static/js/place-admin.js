r.placeModule("adminapi", function(e) {
    var t = e("r");
    return {
        drawRect: function(e, n, i, s) {
            return t.ajax({
                url: "/api/place/drawrect.json",
                type: "POST",
                data: {
                    x: e,
                    y: n,
                    width: i,
                    height: s
                }
            })
        }
    }
}), !r.placeModule("slider", function(e) {
    var t = e("jQuery"),
        n = e("r"),
        r = e("utils").bindEvents,
        i = e("client"),
        s = [.25, .5, 1, i.ZOOM_MIN_SCALE, i.ZOOM_MAX_SCALE];
    n.hooks.get("place.init").register(function() {
        var e = document.getElementById("place-palette"),
            n = t.parseHTML('<input type="range" min="0" step="1">')[0];
        t(n).attr("max", s.length - 1).attr("value", s.length - 1).css("width", "100px"), e.appendChild(n), r(n, {
            input: function(e) {
                var t = s[n.value];
                i.setTargetZoom(t)
            },
            mousedown: function(e) {
                i.disablePan()
            },
            mouseup: function(e) {
                i.enablePan()
            }
        })
    })
}), r.placeModule("selector", function(e) {
    var t = e("r"),
        n = e("adminapi"),
        r = e("utils").bindEvents,
        i = e("canvasse"),
        s = e("client"),
        o = e("hand"),
        u = e("utils").hijack,
        a = e("palette"),
        f = e("world"),
        l = e("notifications"),
        c = {
            isSelecting: !1,
            anchorX: null,
            anchorY: null,
            selectionColor: "hotpink"
        };
    return u(s, "drawTile", function(t, r) {
        if (!c.isSelecting) {
            this.targetMethod.call(this, t, r);
            return
        }
        if (!this.paletteColor || !this.enabled) return;
        if (c.anchorX === null) {
            c.anchorX = t, c.anchorY = r, i.drawTileToDisplay(t, r, c.selectionColor);
            return
        }
        var s = Math.min(t, c.anchorX),
            o = Math.min(r, c.anchorY),
            u = Math.max(t, c.anchorX),
            a = Math.max(r, c.anchorY),
            l = u - s + 1,
            h = a - o + 1;
        this.disable(), i.drawRectToDisplay(s, o, l, h, c.selectionColor), n.drawRect(s, o, l, h).always(function() {
            i.clearRectFromDisplay(s, o, l, h), i.drawBufferToDisplay(), f.enable(), this.clearColor(), this.setCooldownTime(this.cooldown)
        }.bind(this)), c.isSelecting = !1, c.anchorX = null, c.anchorY = null
    }), t.hooks.get("place.init").register(function() {
        l.disable();
        var e = a.buildSwatch(c.selectionColor);
        r(e, {
            click: function(e) {
                e.stopPropagation(), c.isSelecting = !0, f.disable(), s.paletteColor || s.setColor(0), o.updateColor(c.selectionColor)
            }
        })
    }), c
});