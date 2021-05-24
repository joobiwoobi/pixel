r.WebSocket = function(e) {
    this._url = e, this._connectionAttempts = 0, this.on({
        "message:refresh": this._onRefresh
    }, this)
}, _.extend(r.WebSocket.prototype, Backbone.Events, {
    _backoffTime: 2e3,
    _maximumRetries: 9,
    _retryJitterAmount: 3e3,
    start: function() {
        var e = "WebSocket" in window;
        e && this._connect()
    },
    _connect: function() {
        r.debug("websocket: connecting"), this.trigger("connecting"), this._connectionStart = Date.now(), this._socket = new WebSocket(this._url), this._socket.onopen = _.bind(this._onOpen, this), this._socket.onmessage = _.bind(this._onMessage, this), this._socket.onclose = _.bind(this._onClose, this), this._connectionAttempts += 1
    },
    _sendStats: function(e) {
        if (!r.config.stats_domain) return;
        $.ajax({
            type: "POST",
            url: r.config.stats_domain,
            data: JSON.stringify(e),
            contentType: "application/json; charset=utf-8"
        })
    },
    _onOpen: function(e) {
        r.debug("websocket: connected"), this.trigger("connected"), this._connectionAttempts = 0, this._sendStats({
            websocketPerformance: {
                connectionTiming: Date.now() - this._connectionStart
            }
        })
    },
    _onMessage: function(e) {
        var t = JSON.parse(e.data);
        r.debug('websocket: received "' + t.type + '" message'), this.trigger("message message:" + t.type, t.payload)
    },
    _onRefresh: function() {
        var e = Math.random() * 300 * 1e3;
        setTimeout(function() {
            location.reload()
        }, e)
    },
    _onClose: function(e) {
        if (this._connectionAttempts < this._maximumRetries) {
            var t = this._backoffTime * Math.pow(2, this._connectionAttempts),
                n = Math.random() * this._retryJitterAmount - this._retryJitterAmount / 2,
                i = Math.round(t + n);
            r.debug("websocket: connection lost (" + e.code + "), reconnecting in " + i + "ms"), r.debug("(can't connect? Make sure you've allowed https access in your browser.)"), this.trigger("reconnecting", i), setTimeout(_.bind(this._connect, this), i)
        } else r.debug("websocket: maximum retries exceeded. bailing out"), this.trigger("disconnected");
        this._sendStats({
            websocketError: {
                error: 1
            }
        })
    },
    _verifyLocalStorage: function(e) {
        var t = "__synced_local_storage_%(keyname)s__".format({
            keyname: e
        });
        try {
            store.safeSet(t, store.safeGet(t) || "")
        } catch (n) {
            return !1
        }
        return !0
    },
    startPerBrowser: function(e, t, n, r) {
        if (!this._verifyLocalStorage(e)) return !1;
        var i = new Date,
            s = store.safeGet(e) || "";
        if (!s || i - new Date(s) > 15e3) this.on(n), this.start(), store.safeSet(e + "-websocketUrl", t);
        this._keepTrackOfHeartbeat(e, n, t), window.addEventListener("storage", r)
    },
    _writeHeartbeat: function(e, t, n) {
        store.safeSet(e, new Date);
        var r = setInterval(function() {
            var i = new Date,
                s = store.safeGet(e);
            store.safeGet(e + "-websocketUrl") !== n && !!s && i - new Date(s) < 5e3 && (this._maximumRetries = 0, this._socket.close(), clearInterval(r), this._watchHeartbeat(e, t, n)), store.safeSet(e, new Date)
        }.bind(this), 5e3)
    },
    _watchHeartbeat: function(e, t, n) {
        var r = setInterval(function() {
            var i = new Date,
                s = store.safeGet(e) || "";
            if (!s || i - new Date(s) > 15e3) this.on(t), this.start(), store.safeSet(e + "-websocketUrl", n), clearInterval(r), this._writeHeartbeat(e, t, n)
        }.bind(this), 15e3)
    },
    _keepTrackOfHeartbeat: function(e, t, n) {
        store.safeGet(e + "-websocketUrl") === n ? this._writeHeartbeat(e, t, n) : this._watchHeartbeat(e, t, n)
    }
}), ! function(e, t, n) {
    function i(e) {
        return r[e]
    }
    var r = {
        r: e,
        jQuery: t,
        underscore: n,
        store: store
    };
    e.placeModule = function(e, t) {
        var n = t(i);
        e && (r[e] = n)
    }
}(r, jQuery, _), !r.placeModule("utils", function(e) {
    var t = .05;
    return {
        lerp: function(e, n, r) {
            var i = e + r * (n - e);
            return Math.abs(n - i) < t ? n : i
        },
        bindEvents: function(e, t, n) {
            n = n === undefined ? !0 : n;
            for (var r in t) e.addEventListener(r, t[r], !0)
        },
        parseHexColor: function(e) {
            var t = parseInt(e.slice(1), 16);
            return {
                red: t >> 16 & 255,
                green: t >> 8 & 255,
                blue: t & 255
            }
        },
        hijack: function(e, t, n) {
            var r = e[t];
            e[t] = function() {
                e.targetMethod = r;
                var t = n.apply(e, arguments);
                delete e.targetMethod
            }
        },
        clamp: function(e, t, n) {
            return Math.min(Math.max(n, e), t)
        },
        getDistance: function(e, t, n, r) {
            var i = e - n,
                s = t - r;
            return Math.sqrt(i * i + s * s)
        },
        normalizeVector: function(e) {
            var t = e.x,
                n = e.y;
            if (!t && !n) return;
            var r = Math.sqrt(t * t + n * n);
            if (!r) return;
            e.x = t / r, e.y = n / r
        }
    }
}), !r.placeModule("activity", function(e) {
    function t(e) {
        return e >= 1e6 ? (e / 1e6).toFixed(2) + "m" : e >= 1e5 ? parseInt(e / 1e3, 10) + "k" : e >= 1100 ? (e / 1e3).toFixed(1) + "k" : e.toString()
    }
    return {
        $el: null,
        initialized: !1,
        lastCount: 0,
        init: function(e, t) {
            this.$el = $(e), this.$el.removeClass("place-uninitialized"), this.initialized = !0, this.setCount(t)
        },
        setCount: function(e) {
            if (!this.initialized) return;
            if (e === this.lastCount) return;
            this.lastCount = e, this.$el.text(t(e))
        }
    }
}), !r.placeModule("api", function(e) {
    var t = e("r"),
        n = function(e) {
            return window.location.hostname == "oauth.reddit.com" ? window.location.protocol + "//www.reddit.com" + e : window.location.protocol + "//" + window.location.hostname + e
        },
        r = function(e) {
            return i.Authorization && (e = "https://oauth.reddit.com" + e), e
        },
        i = {};
    return {
        injectHeaders: function(e) {
            i = e
        },
        draw: function(e, n, s) {
            return t.ajax({
                url: r("/api/place/draw.json"),
                type: "POST",
                headers: i,
                data: {
                    x: e,
                    y: n,
                    color: s
                }
            })
        },
        getCanvasBitmapState: function() {
            function o(e) {
                r || (r = (new Uint32Array(e.buffer, 0, 1))[0], e = new Uint8Array(e.buffer, 4));
                for (var t = 0; t < e.byteLength; t++) i[s + 2 * t] = e[t] >> 4, i[s + 2 * t + 1] = e[t] & 15;
                s += e.byteLength * 2
            }
            var e = $.Deferred(),
                r, i = new Uint8Array(t.config.place_canvas_width * t.config.place_canvas_height),
                s = 0;
            if (window.fetch) fetch(n("/api/place/board-bitmap"), {
                credentials: "include"
            }).then(function(t) {
                function n(t) {
                    t.read().then(function(s) {
                        s.done ? e.resolve(r, i) : (o(s.value), n(t))
                    })
                }
                if (!t.body || !t.body.getReader) {
                    t.arrayBuffer().then(function(t) {
                        o(new Uint8Array(t)), e.resolve(r, i)
                    });
                    return
                }
                n(t.body.getReader())
            });
            else {
                var u = new XMLHttpRequest;
                u.responseType = "arraybuffer";
                var a = u.open("GET", n("/api/place/board-bitmap"), !0);
                u.onload = function(t) {
                    var n = u.response;
                    n || e.resolve();
                    var s = new Uint8Array(n);
                    o(s), e.resolve(r, i)
                }, u.send(null)
            }
            return e.promise()
        },
        getTimeToWait: function() {
            return t.ajax({
                url: r("/api/place/time.json"),
                headers: i,
                type: "GET"
            }).then(function(t, n, r) {
                return 1e3 * t.wait_seconds
            })
        },
        getPixelInfo: function(e, n) {
            return t.ajax({
                url: r("/api/place/pixel.json"),
                headers: i,
                type: "GET",
                data: {
                    x: e,
                    y: n
                }
            })
        }
    }
}), !r.placeModule("audio", function(e) {
    function t(e) {
        return Math.pow(2, (e - 69) / 12) * 440
    }
    var n = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
        r = {
            "C#": "D@",
            "D#": "E@",
            "F#": "G@",
            "G#": "A@",
            "A#": "B@"
        },
        i = 8,
        s = {};
    return n.forEach(function(e, n) {
        var o, u, a;
        for (o = 0; o < i; o++) u = (o + 1) * 12 + n, a = t(u), s[e + o] = a, e in r && (s[r[e] + o] = a)
    }), {
        audioCtx: null,
        audioGain: null,
        enabled: !0,
        isSupported: !0,
        init: function() {
            var e = window.AudioContext || window.webkitAudioContext;
            e ? (this.audioCtx = new e, this.audioGain = this.audioCtx.createGain(), this.audioGain.connect(this.audioCtx.destination)) : (this.enabled = !1, this.isSupported = !1)
        },
        disable: function() {
            this.enabled = !1
        },
        enable: function() {
            this.enabled = !0
        },
        scheduleAudio: function(e, t, n) {
            var r = this.audioCtx.createOscillator();
            r.frequency.value = e, r.connect(this.audioGain), r.start(t), r.stop(n)
        },
        playClip: function(e, t) {
            if (!this.enabled) return;
            t = t === undefined ? this.globalVolume : Math.max(0, Math.min(1, t)), this.audioGain.gain.value = t;
            var n = this.audioCtx.currentTime,
                r, i, s;
            for (var o = 0; o < e.length; o++) r = e[o], i = r[0], s = r[1], i && this.scheduleAudio(i, n, n + s), n += s
        },
        compileClip: function(e) {
            return e.map(function(e) {
                var t = e[0],
                    n = e[1],
                    r = s[t] || 0;
                return [r, n]
            })
        },
        setGlobalVolume: function(e) {
            this.globalVolume = Math.min(1, Math.max(0, e))
        }
    }
}), !r.placeModule("camera", function(e) {
    var t = e("jQuery");
    return {
        zoomElement: null,
        panElement: null,
        isDirty: !1,
        init: function(e, t) {
            this.zoomElement = e, this.panElement = t
        },
        tick: function() {
            return this.isDirty ? (this.isDirty = !1, !0) : !1
        },
        updateScale: function(e) {
            this.isDirty = !0, t(this.zoomElement).css({
                transform: "scale(" + e + "," + e + ")"
            })
        },
        updateTranslate: function(e, n) {
            this.isDirty = !0, t(this.panElement).css({
                transform: "translate(" + e + "px," + n + "px)"
            })
        }
    }
}), !r.placeModule("camerabutton", function(e) {
    var t = e("jQuery");
    return {
        $el: null,
        $container: null,
        enabled: !1,
        init: function(e) {
            this.$el = t(e), this.$container = this.$el.parent(), this.$el.hide(), this.$el.detach()
        },
        enable: function() {
            if (this.enabled) return;
            this.enabled = !0, this.$container.append(this.$el), this.$el.show()
        },
        disable: function() {
            if (!this.enabled) return;
            this.enabled = !1, this.$el.hide(), this.$el.detach()
        },
        showEnable: function() {
            this.$el.removeClass("place-following")
        },
        showDisable: function() {
            this.$el.addClass("place-following")
        }
    }
}), !r.placeModule("canvasse", function(e) {
    var t = e("jQuery");
    return {
        width: 0,
        height: 0,
        el: null,
        ctx: null,
        isBufferDirty: !1,
        isDisplayDirty: !1,
        init: function(e, t, n) {
            this.width = t, this.height = n, this.el = e, this.el.width = t, this.el.height = n, this.ctx = this.el.getContext("2d"), this.ctx.mozImageSmoothingEnabled = !1, this.ctx.webkitImageSmoothingEnabled = !1, this.ctx.msImageSmoothingEnabled = !1, this.ctx.imageSmoothingEnabled = !1, this.buffer = new ArrayBuffer(t * n * 4), this.readBuffer = new Uint8ClampedArray(this.buffer), this.writeBuffer = new Uint32Array(this.buffer)
        },
        tick: function() {
            return this.isBufferDirty ? (this.drawBufferToDisplay(), !0) : !1
        },
        drawTileAt: function(e, t, n) {
            this.drawTileToBuffer(e, t, n)
        },
        drawTileToDisplay: function(e, t, n) {
            this.ctx.fillStyle = n, this.ctx.fillRect(e, t, 1, 1), this.isDisplayDirty = !0
        },
        drawRectToDisplay: function(e, t, n, r, i) {
            this.ctx.fillStyle = i, this.ctx.fillRect(e, t, n, r), this.isDisplayDirty = !0
        },
        clearRectFromDisplay: function(e, t, n, r) {
            this.ctx.clearRect(e, t, n, r), this.isDisplayDirty = !0
        },
        drawTileToBuffer: function(e, t, n) {
            var r = this.getIndexFromCoords(e, t);
            this.setBufferState(r, n)
        },
        getIndexFromCoords: function(e, t) {
            return t * this.width + e
        },
        setBufferState: function(e, t) {
            this.writeBuffer[e] = t, this.isBufferDirty = !0
        },
        drawBufferToDisplay: function() {
            var e = new ImageData(this.readBuffer, this.width, this.height);
            this.ctx.putImageData(e, 0, 0), this.isBufferDirty = !1
        }
    }
}), !r.placeModule("coordinates", function(e) {
    return {
        $el: null,
        initialized: !1,
        lastX: -1,
        lastY: -1,
        init: function(e, t, n) {
            this.$el = $(e), this.$el.removeClass("place-uninitialized"), this.initialized = !0, this.setCoordinates(t, n)
        },
        setCoordinates: function(e, t) {
            if (!this.initialized) return;
            if (e !== this.lastX || t !== this.lastY) this.lastX = e, this.lastY = t, this.$el.text("(" + e + ", " + t + ")")
        }
    }
}), !r.placeModule("hand", function(e) {
    var t = e("jQuery");
    return {
        enabled: !0,
        hand: null,
        swatch: null,
        visible: !1,
        init: function(e, t, n) {
            this.hand = e, this.swatch = t, this.cursor = n
        },
        disable: function() {
            this.visible && this.hideCursor(), this.enabled = !1, t(this.hand).css({
                display: "none"
            })
        },
        enable: function() {
            this.enabled = !0, t(this.hand).css({
                display: "block"
            }), this.visible && this.showCursor()
        },
        updateTransform: function(e, n, r) {
            if (!this.enabled) return;
            t(this.hand).css({
                transform: "translateX(" + e + "px) " + "translateY(" + n + "px) " + "rotateZ(" + r + "deg)"
            })
        },
        updateCursorTransform: function(e, n) {
            if (!this.enabled) return;
            t(this.cursor).css({
                transform: "translateX(" + (e - 20) + "px) " + "translateY(" + (n - 20) + "px)"
            })
        },
        showCursor: function() {
            this.visible = !0;
            if (!this.enabled) return;
            t(this.cursor).show()
        },
        hideCursor: function() {
            this.visible = !1;
            if (!this.enabled) return;
            t(this.cursor).hide()
        },
        updateColor: function(e) {
            if (!this.enabled) return;
            t(this.swatch).css({
                backgroundColor: e,
                display: "block"
            })
        },
        clearColor: function() {
            if (!this.enabled) return;
            t(this.swatch).css({
                display: "none"
            })
        }
    }
}), !r.placeModule("inspector", function(e) {
    var t = _.template('<div class="place-inspector-user-row"><a href="https://www.reddit.com/user/<%- username %>" target="_blank">u/<%- username %></a></div><div class="place-inspector-location-row">(<%- x %>, <%- y %>)</div><div class="place-inspector-timestamp-row"><%- timestamp %></div><div class="place-inspector-link-row"><input type="text" value="<%- link %>"></div>');
    return {
        isVisible: !1,
        init: function(e) {
            this.$el = $(e), this.$el.on("focus", "input", function(e) {
                $(this).select()
            })
        },
        show: function(e, n, i, s) {
            var o = r.TimeText.now() / 1e3 - s;
            this.$el.html(t({
                x: e,
                y: n,
                username: i,
                timestamp: r.TimeText.prototype.formatTime(null, o),
                link: "https://www.reddit.com/r/place#x=" + e + "&y=" + n
            })), this.$el.show(), this.isVisible = !0
        },
        hide: function() {
            this.$el.hide(), this.isVisible = !1
        }
    }
}), !r.placeModule("keyboard", function(e) {
    var t = 1,
        n = 2;
    return {
        enabled: !0,
        keys: {
            UP: 0,
            DOWN: 0,
            LEFT: 0,
            RIGHT: 0,
            W: 0,
            A: 0,
            S: 0,
            D: 0
        },
        keyNameAliases: {
            ARROWUP: "UP",
            ARROWDOWN: "DOWN",
            ARROWLEFT: "LEFT",
            ARROWRIGHT: "RIGHT"
        },
        init: function() {
            window.addEventListener("keydown", function(e) {
                if (!this.enabled) return;
                var n = this.getKeyName(e.keyCode, e.keyIdentifier || e.key);
                n in this.keys && (this.keys[n] |= t, e.preventDefault())
            }.bind(this)), window.addEventListener("keyup", function(e) {
                if (!this.enabled) return;
                var n = this.getKeyName(e.keyCode, e.keyIdentifier || e.key);
                n in this.keys && (this.keys[n] &= ~t, e.preventDefault())
            }.bind(this))
        },
        disable: function() {
            this.enabled = !1
        },
        enable: function() {
            this.enabled = !0
        },
        getKeyName: function(e, t) {
            t.slice(0, 2) === "U+" && (t = String.fromCharCode(e)), t = t.toUpperCase();
            var n = this.keyNameAliases[t];
            return n ? n : t
        },
        tick: function() {
            if (!this.enabled) return;
            for (var e in this.keys) this.isKeyDown(e) ? this.keys[e] |= n : this.keys[e] &= ~n
        },
        isKeyDown: function(n) {
            return this.keys[n] & t
        },
        isKeyPressed: function(n) {
            return this.keys[n] === t
        },
        isKeyReleased: function(t) {
            return this.keys[t] === n
        }
    }
}), !r.placeModule("mollyguard", function(e) {
    var t = e("jQuery");
    return {
        $el: null,
        initialized: !1,
        init: function(e) {
            this.$el = t(e), this.$el.removeClass("place-uninitialized"), this.initialized = !0
        },
        showUnlocked: function() {
            if (!this.initialized) return;
            this.$el.removeClass("place-locked")
        },
        showLocked: function() {
            if (!this.initialized) return;
            this.$el.addClass("place-locked")
        }
    }
}), !r.placeModule("mutebutton", function(e) {
    var t = e("jQuery");
    return {
        $el: null,
        initialized: !1,
        init: function(e) {
            this.$el = t(e), this.$el.removeClass("place-uninitialized"), this.initialized = !0
        },
        showMute: function() {
            if (!this.initialized) return;
            this.$el.removeClass("place-muted")
        },
        showUnmute: function() {
            if (!this.initialized) return;
            this.$el.addClass("place-muted")
        }
    }
}), !r.placeModule("notificationbutton", function(e) {
    var t = e("jQuery");
    return {
        $el: null,
        initialized: !1,
        init: function(e) {
            this.$el = t(e), this.$el.removeClass("place-uninitialized"), this.initialized = !0
        },
        show: function() {
            if (!this.initialized) return;
            this.$el.show()
        },
        showNotificationOff: function() {
            if (!this.initialized) return;
            this.$el.removeClass("place-notification-on")
        },
        showNotificationOn: function() {
            if (!this.initialized) return;
            this.$el.addClass("place-notification-on")
        }
    }
}), !r.placeModule("notifications", function(e) {
    return {
        DEFAULT_TIMEOUT: 3e3,
        enabled: !1,
        init: function() {
            if (!window.Notification) return;
            if (Notification.permission === "granted") {
                this.enabled = !0;
                return
            }
            try {
                Notification.requestPermission().then(function(e) {
                    e === "granted" && (this.enabled = !0)
                }.bind(this))
            } catch (e) {}
        },
        disable: function() {
            this.enabled = !1
        },
        sendNotification: function(e, t) {
            if (!this.enabled) return;
            t = t === undefined ? this.DEFAULT_TIMEOUT : t;
            var n = new Notification("Place", {
                icon: "/static/place_icon.png",
                body: e
            });
            n.onclick = function(e) {
                window.focus(), n.close()
            }, t && setTimeout(function() {
                n.close()
            }, t)
        }
    }
}), !r.placeModule("palette", function(e) {
    var t = e("jQuery");
    return {
        SWATCH_CLASS: "place-swatch",
        el: null,
        initialized: !1,
        init: function(e) {
            this.el = e, t(e).removeClass("place-uninitialized"), this.initialized = !0
        },
        generateSwatches: function(e) {
            if (!this.initialized) return;
            t(this.el).children("." + this.SWATCH_CLASS).remove(), e.forEach(function(e, t) {
                this.buildSwatch(e, t)
            }, this)
        },
        buildSwatch: function(e, n) {
            if (!this.initialized) return;
            var r = document.createElement("div");
            return t(r).css("backgroundColor", e).data("color", n).addClass("place-swatch"), this.el.appendChild(r), r
        },
        highlightSwatch: function(e) {
            t(this.el).children(".place-swatch").eq(e).addClass("place-selected")
        },
        clearSwatchHighlights: function() {
            t(this.el).children(".place-swatch").removeClass("place-selected")
        }
    }
}), !r.placeModule("zoombutton", function(e) {
    var t = e("jQuery");
    return {
        $el: null,
        initialized: !1,
        init: function(e) {
            this.$el = t(e), this.$el.removeClass("place-uninitialized"), this.initialized = !0
        },
        showZoomOut: function() {
            if (!this.initialized) return;
            this.$el.removeClass("place-zoomed-out")
        },
        showZoomIn: function() {
            if (!this.initialized) return;
            this.$el.addClass("place-zoomed-out")
        },
        highlight: function(e) {
            if (!this.initialized) return;
            this.$el.toggleClass("place-zoom-pulsing", e)
        }
    }
}), !r.placeModule("timer", function(e) {
    var t = e("jQuery"),
        n;
    return {
        REFRESH_INTERVAL_MS: 100,
        $el: null,
        init: function(e) {
            this.$el = t(e), this.lastDisplayText = null
        },
        getTimeRemaining: function(e) {
            var t = Date.now();
            return Math.max(0, e - t)
        },
        show: function() {
            this.$el.show()
        },
        hide: function() {
            this.$el.hide()
        },
        setText: function(e) {
            this.$el.text(e)
        },
        startTimer: function(e) {
            this.stopTimer();
            var t = function() {
                var t = this.getTimeRemaining(e),
                    n = Math.min(3599, Math.ceil(t / 1e3)),
                    r = Math.floor(n / 60);
                n %= 60;
                var i = (n < 10 ? "0" : "") + n,
                    s = (r < 10 ? "0" : "") + r,
                    o = s + ":" + i;
                o !== this.lastDisplayText && (this.lastDisplayText = o, this.setText(o)), t || this.stopTimer()
            }.bind(this);
            t(), n = setInterval(t, this.REFRESH_INTERVAL_MS)
        },
        stopTimer: function() {
            n && (n = clearInterval(n))
        }
    }
}), !r.placeModule("client", function(e) {
    function U(e, t, n, r, i, s) {
        return r * t.reduce(function(t, r) {
            const o = Math.abs(e.x - r.x) + Math.abs(e.y - r.y);
            return o ? o > n ? t + 1 / Math.pow(o, i) : t + Math.pow(n, s - i) / Math.pow(o, s) : t
        }, 0)
    }
    var t = e("jQuery"),
        n = e("r"),
        r = e("store"),
        i = e("audio"),
        s = e("camera"),
        o = e("camerabutton"),
        u = e("canvasse"),
        a = e("coordinates"),
        f = e("hand"),
        l = e("inspector"),
        c = e("keyboard"),
        h = e("mollyguard"),
        p = e("mutebutton"),
        d = e("notificationbutton"),
        v = e("notifications"),
        m = e("palette"),
        g = e("api"),
        y = e("timer"),
        b = e("utils").lerp,
        w = e("zoombutton"),
        E = e("utils").parseHexColor,
        S = e("utils").clamp,
        x = e("utils").getDistance,
        T = e("utils").normalizeVector,
        N = 15,
        C = "#FFFFFF",
        k = 4294967295,
        L = i.compileClip([
            ["E7", 1 / 32],
            ["C7", 1 / 32],
            ["A6", 1 / 16]
        ]),
        A = i.compileClip([
            ["G7", 1 / 32],
            ["E7", 1 / 32],
            ["C6", 1 / 16]
        ]),
        O = i.compileClip([
            ["C7", 1 / 32],
            ["E7", 1 / 32],
            ["G8", 1 / 16]
        ]),
        M = i.compileClip([
            ["E4", 1 / 32],
            ["C4", 1 / 32],
            ["A3", 1 / 16]
        ]),
        _ = i.compileClip([
            ["D6", 1 / 32],
            ["C6", 1 / 32],
            ["A5", 1 / 16]
        ]),
        D = _.slice().reverse(),
        P = [],
        H = 0,
        B = 100,
        j, F = 0,
        I = 1,
        q = .5,
        R = 1;
    return {
        AUTOCAMERA_INTERVAL: 3e3,
        ZOOM_LERP_SPEED: .2,
        PAN_LERP_SPEED: .4,
        ZOOM_MAX_SCALE: 40,
        ZOOM_MIN_SCALE: 4,
        VOLUME_LEVEL: .1,
        MAXIMUM_AUDIBLE_DISTANCE: 10,
        WORLD_AUDIO_MULTIPLIER: .1,
        MAX_WORLD_AUDIO_RATE: 250,
        KEYBOARD_PAN_SPEED: .5,
        KEYBOARD_PAN_LERP_SPEED: .275,
        DEFAULT_COLOR_PALETTE: ["#FFFFFF", "#E4E4E4", "#888888", "#222222", "#FFA7D1", "#E50000", "#E59500", "#A06A42", "#E5D900", "#94E044", "#02BE01", "#00D3DD", "#0083C7", "#0000EA", "#CF6EE4", "#820080"],
        state: null,
        autoCameraEnabled: !1,
        colorIndex: null,
        paletteColor: null,
        cooldown: 0,
        cooldownEndTime: 0,
        cooldownPromise: null,
        palette: null,
        enabled: !0,
        isZoomedIn: !1,
        isPanEnabled: !0,
        lastWorldAudioTime: 0,
        isWorldAudioEnabled: !0,
        containerSize: {
            width: 0,
            height: 0
        },
        panX: 0,
        panY: 0,
        zoom: 1,
        currentDirection: {
            x: 0,
            y: 0
        },
        _panX: 0,
        _panY: 0,
        _zoom: 1,
        _currentDirection: {
            x: 0,
            y: 0
        },
        init: function(e, t, n, s, o) {
            this.enabled = !1, this.isZoomedIn = !0, this.cooldown = t, o && this.setColor(o, !1), this.setZoom(this.isZoomedIn ? this.ZOOM_MAX_SCALE : this.ZOOM_MIN_SCALE), this.setOffset(n | 0, s | 0), i.setGlobalVolume(this.VOLUME_LEVEL), this.setColorPalette(this.DEFAULT_COLOR_PALETTE), m.generateSwatches(this.DEFAULT_COLOR_PALETTE);
            var a = !!r.safeGet("place-audio-isDisabled");
            a && this._setAudioEnabled(!1), this.getZoomButtonClicked() || w.highlight(!0);
            var f = parseInt(r.safeGet("iOS-Notifications-Enabled"), 10) === 1;
            f && d.showNotificationOn(), this.state = new Uint8Array(new ArrayBuffer(u.width * u.height))
        },
        setColorPalette: function(e) {
            var t = this.palette === null;
            this.palette = e, m.generateSwatches(e);
            var n = new DataView(new ArrayBuffer(4));
            n.setUint8(0, 255), this.paletteABGR = e.map(function(e) {
                var t = E(e);
                return n.setUint8(1, t.blue), n.setUint8(2, t.green), n.setUint8(3, t.red), n.getUint32(0)
            }), t || this.setInitialState(this.state)
        },
        setCooldownTime: function(e) {
            var n = Date.now();
            this.cooldownEndTime = n + e;
            var r = t.Deferred();
            return setTimeout(function() {
                this.enable(), r.resolve(), this.cooldownPromise = null, h.showUnlocked(), y.stopTimer(), y.hide()
            }.bind(this), e), e && (y.startTimer(this.cooldownEndTime), y.show()), this.cooldownPromise = r.promise(), e && h.showLocked(), this.cooldownPromise
        },
        whenCooldownEnds: function() {
            if (this.cooldownPromise) return this.cooldownPromise;
            var e = t.Deferred();
            return e.resolve(), e.promise()
        },
        getCooldownTimeRemaining: function() {
            var e = Date.now(),
                t = this.cooldownEndTime - e;
            return Math.max(0, t)
        },
        tick: function() {
            var e = !1;
            this._zoom !== this.zoom && (this._zoom = b(this._zoom, this.zoom, this.ZOOM_LERP_SPEED), s.updateScale(this._zoom), e = !0), this.currentDirection.x = 0, this.currentDirection.y = 0;
            if (c.isKeyDown("LEFT") || c.isKeyDown("A")) this.currentDirection.x -= 1;
            if (c.isKeyDown("RIGHT") || c.isKeyDown("D")) this.currentDirection.x += 1;
            if (c.isKeyDown("UP") || c.isKeyDown("W")) this.currentDirection.y -= 1;
            if (c.isKeyDown("DOWN") || c.isKeyDown("S")) this.currentDirection.y += 1;
            T(this.currentDirection), this._currentDirection.x !== this.currentDirection.x && (this._currentDirection.x = b(this._currentDirection.x, this.currentDirection.x, this.KEYBOARD_PAN_LERP_SPEED)), this._currentDirection.y !== this.currentDirection.y && (this._currentDirection.y = b(this._currentDirection.y, this.currentDirection.y, this.KEYBOARD_PAN_LERP_SPEED));
            var t = this.ZOOM_MAX_SCALE / this._zoom * this.KEYBOARD_PAN_SPEED;
            this.panX -= this._currentDirection.x * t, this.panY -= this._currentDirection.y * t;
            var n = !1;
            this._panX !== this.panX && (this._panX = b(this._panX, this.panX, this.PAN_LERP_SPEED), n = !0), this._panY !== this.panY && (this._panY = b(this._panY, this.panY, this.PAN_LERP_SPEED), n = !0), e = e || n;
            if (n) {
                s.updateTranslate(this._panX, this._panY);
                var r = this.getCameraLocationFromOffset(this._panX, this._panY);
                a.setCoordinates(Math.round(r.x), Math.round(r.y))
            }
            return e
        },
        getPaletteColor: function(e) {
            return e = Math.min(N, Math.max(0, e | 0)), this.palette[e % this.palette.length] || C
        },
        getPaletteColorABGR: function(e) {
            return e = Math.min(N, Math.max(0, e | 0)), this.paletteABGR[e % this.paletteABGR.length] || k
        },
        setInitialState: function(e) {
            var t = [],
                n, r;
            for (var i = 0; i < e.length; i++) n = e[i], r = this.getPaletteColorABGR(n), u.setBufferState(i, r), n > 0 && (this.state[i] = n);
            u.drawBufferToDisplay()
        },
        setColor: function(e, t) {
            t = t === undefined ? !0 : t, this.interact();
            if (!this.enabled) {
                t && i.playClip(M);
                return
            }
            this.colorIndex = e, this.paletteColor = this.getPaletteColor(e), this.paletteColorABGR = this.getPaletteColorABGR(e), f.updateColor(this.paletteColor), this.isZoomedIn && f.showCursor(), m.clearSwatchHighlights(), m.highlightSwatch(e), t && i.playClip(O)
        },
        clearColor: function(e) {
            e = e === undefined ? !0 : e, f.clearColor(), f.hideCursor(), m.clearSwatchHighlights(), this.paletteColor = null, this.paletteColorABGR = null, e && i.playClip(L)
        },
        hasColor: function() {
            return this.paletteColor !== null
        },
        setZoom: function(e) {
            this._zoom = this.zoom = e, this.isZoomedIn = e === this.ZOOM_MAX_SCALE, this.isZoomedIn ? this.hasColor() && f.showCursor() : f.hideCursor(), s.updateScale(this._zoom)
        },
        setOffset: function(e, t) {
            this._panX = this.panX = e, this._panY = this.panY = t, s.updateTranslate(this._panX, this._panY);
            var n = this.getCameraLocationFromOffset(this._panX, this._panY);
            a.setCoordinates(Math.round(n.x), Math.round(n.y))
        },
        getOffsetFromCameraPosition: function(e, t) {
            return {
                x: -e,
                y: -t
            }
        },
        getOffsetFromCameraLocation: function(e, t) {
            var n = this.getCanvasSize();
            return {
                x: -(e - n.width / 2),
                y: -(t - n.height / 2)
            }
        },
        getCameraLocationFromOffset: function(e, t) {
            var n = this.getCanvasSize();
            return {
                x: n.width / 2 - e,
                y: n.height / 2 - t
            }
        },
        getLocationFromCursorPosition: function(e, t) {
            var n = this.getCanvasSize(),
                r = this.getContainerSize();
            return {
                x: Math.round(e / this.zoom + n.width / 2 - r.width / (2 * this.zoom) - this.panX),
                y: Math.round(t / this.zoom + n.height / 2 - r.height / (2 * this.zoom) - this.panY)
            }
        },
        getCursorPositionFromLocation: function(e, t) {
            var n = this.getCanvasSize(),
                r = this.getContainerSize();
            return {
                x: this.zoom * (e - n.width / 2 + r.width / (2 * this.zoom) + this.panX),
                y: this.zoom * (t - n.height / 2 + r.height / (2 * this.zoom) + this.panY)
            }
        },
        setCameraPosition: function(e, t) {
            var n = this.getOffsetFromCameraPosition(e, t);
            this.setOffset(n.x, n.y)
        },
        setCameraLocation: function(e, t) {
            var n = this.getOffsetFromCameraLocation(e, t);
            this.setOffset(n.x, n.y)
        },
        setTargetZoom: function(e) {
            this.zoom = e, this.isZoomedIn = e === this.ZOOM_MAX_SCALE
        },
        setTargetOffset: function(e, t) {
            this.panX = e, this.panY = t
        },
        setTargetCameraPosition: function(e, t) {
            var n = this.getOffsetFromCameraPosition(e, t);
            this.setTargetOffset(n.x, n.y)
        },
        setTargetCameraLocation: function(e, t) {
            var n = this.getOffsetFromCameraLocation(e, t);
            this.setTargetOffset(n.x, n.y)
        },
        attemptToFireiOSLocalNotification: function() {
            if (parseInt(r.safeGet("iOS-Notifications-Enabled"), 10) === 1) {
                var e = window.navigator.userAgent.indexOf("iPhone") > -1 && window.innerHeight > 200;
                if (e && typeof webkit != "undefined") try {
                    webkit.messageHandlers.tilePlacedHandler.postMessage(this.cooldown / 1e3)
                } catch (t) {}
            }
        },
        drawTile: function(e, t) {
            this.interact();
            if (!this.paletteColor || !this.enabled) {
                i.playClip(M);
                return
            }
            this.disable(), h.showLocked(), y.show(), y.setText("Painting..."), i.playClip(A);
            var n = u.getIndexFromCoords(e, t);
            this.state[n] = this.colorIndex, u.drawTileAt(e, t, this.paletteColorABGR), this.clearColor(!1), this.attemptToFireiOSLocalNotification()
        },
        inspectTile: function(e, t) {
            this.interact(), g.getPixelInfo(e, t).then(function(r, i, s) {
                "color" in r ? (this.setTargetCameraLocation(e, t), l.show(r.x, r.y, r.user_name, r.timestamp)) : l.isVisible && l.hide()
            }.bind(this), function(t, n, r) {
                console.error(t)
            }.bind(this))
        },
        toggleZoom: function(e, t) {
            this.interact(), this.isZoomedIn ? (this.setTargetZoom(this.ZOOM_MIN_SCALE), i.playClip(_), w.showZoomIn(), f.hideCursor()) : (this.hasColor() && f.showCursor(), this.setTargetZoom(this.ZOOM_MAX_SCALE), e !== undefined && t !== undefined && this.setTargetOffset(e, t), i.playClip(D), w.showZoomOut()), this.isZoomedIn = this.zoom === this.ZOOM_MAX_SCALE
        },
        getCanvasSize: function() {
            return {
                width: u.width,
                height: u.height
            }
        },
        setContainerSize: function(e, t) {
            this.containerSize.width = e, this.containerSize.height = t
        },
        getContainerSize: function() {
            return this.containerSize
        },
        disable: function() {
            this.enabled = !1
        },
        enable: function() {
            this.enabled = !0
        },
        disablePan: function() {
            this.isPanEnabled = !1
        },
        enablePan: function() {
            this.isPanEnabled = !0
        },
        injectHeaders: function(e) {
            g.injectHeaders(e);
            var t = window.navigator.userAgent.indexOf("iPhone") > -1 && window.innerHeight > 200;
            t && d.show()
        },
        _setAudioEnabled: function(e) {
            if (!i.isSupported) return;
            this.interact(), e ? (i.enable(), p.showMute(), r.remove("place-audio-isDisabled")) : (i.disable(), p.showUnmute(), r.safeSet("place-audio-isDisabled", "1"))
        },
        getZoomButtonClicked: function() {
            return parseInt(r.safeGet("place-zoom-wasClicked"), 10) || 0
        },
        setZoomButtonClicked: function() {
            r.safeSet("place-zoom-wasClicked", "1")
        },
        toggleVolume: function() {
            this._setAudioEnabled(!i.enabled), i.playClip(O)
        },
        toggleNotificationButton: function() {
            var e = parseInt(r.safeGet("iOS-Notifications-Enabled"), 10) === 1;
            e ? (r.safeSet("iOS-Notifications-Enabled", "0"), d.showNotificationOff()) : (r.safeSet("iOS-Notifications-Enabled", "1"), d.showNotificationOn())
        },
        setVolume: function(e) {
            if (!i.isSupported) return;
            e ? i.globalVolume || this._setAudioEnabled(!0) : this._setAudioEnabled(!1), i.setGlobalVolume(e), i.playClip(O)
        },
        interact: function() {
            this.disableAutoCamera(), l.isVisible && l.hide()
        },
        receiveTile: function(e, t) {
            this.trackRecentTile(e, t);
            if (!this.isWorldAudioEnabled) return;
            var n = this.getCameraLocationFromOffset(this._panX, this._panY),
                r = Math.abs(x(n.x, n.y, e, t));
            this.playTileSoundAtDistance(r)
        },
        enableWorldAudio: function() {
            this.isWorldAudioEnabled = !0
        },
        disableWorldAudio: function() {
            this.isWorldAudioEnabled = !1
        },
        playTileSoundAtDistance: function(e) {
            if (e > this.MAXIMUM_AUDIBLE_DISTANCE) return;
            var t = Date.now();
            if (t - this.lastWorldAudioTime < this.MAX_WORLD_AUDIO_RATE) return;
            this.lastWorldAudioTime = t;
            var n = i.globalVolume,
                r = S(0, 1, Math.pow(2, -e / 2)),
                s = n * r * this.WORLD_AUDIO_MULTIPLIER;
            i.playClip(A, s)
        },
        trackRecentTile: function(e, t) {
            P[H] ? (P[H].x = e, P[H].y = t) : P[H] = {
                x: e,
                y: t
            }, H = (H + 1) % B
        },
        toggleAutoCamera: function() {
            this.autoCameraEnabled ? this.disableAutoCamera() : this.enableAutoCamera()
        },
        enableAutoCamera: function() {
            if (this.autoCameraEnabled) return;
            this.autoCameraEnabled = !0, o.showDisable(), j = setInterval(function() {
                var e = 0,
                    t = 0,
                    n, r;
                for (var i = 0; i < P.length; i++) n = P[i], r = U(n, P, F, I, q, R), r > e && (e = r, t = i);
                n && this.setTargetCameraLocation(n.x, n.y)
            }.bind(this), this.AUTOCAMERA_INTERVAL)
        },
        disableAutoCamera: function() {
            if (!this.autoCameraEnabled) return;
            this.autoCameraEnabled = !1, o.showEnable(), clearInterval(j)
        },
        clearrecentTiles: function() {
            P.length = 0, H = 0
        }
    }
}), !r.placeModule("cursor", function(e) {
    function r(e, t) {
        return Math.sqrt(e * e + t * t)
    }
    var t = e("hand"),
        n = e("utils").lerp;
    return {
        MIN_DRAG_DISTANCE: 2,
        MIN_CURSOR_LERP_DELTA: 1,
        ROTATE_Z_FACTOR: 6,
        CURSOR_TRANSLATE_LERP: 1,
        CURSOR_ROTATE_LERP: .5,
        isUsingTouch: !1,
        isDown: !1,
        downX: 0,
        downY: 0,
        upX: 0,
        upY: 0,
        x: 0,
        y: 0,
        rotateZ: 0,
        dragDistance: 0,
        didDrag: !1,
        _x: 0,
        _y: 0,
        _rotateZ: 0,
        tick: function() {
            var e = !1;
            if (this._x !== this.x) {
                e = !0;
                var r = this.x - this._x,
                    i = Math.abs(r);
                this._x = n(this._x, this.x, this.CURSOR_TRANSLATE_LERP), i < this.MIN_CURSOR_LERP_DELTA && (this._x = this.x);
                var s = r > 0 ? -1 : 1;
                this.rotateZ = Math.log2(i) * s * this.ROTATE_Z_FACTOR;
                if (!isFinite(this.rotateZ) || i < this.MIN_CURSOR_LERP_DELTA) this.rotateZ = 0
            } else this.rotateZ && (this.rotateZ = 0);
            if (this._y !== this.y) {
                e = !0;
                var o = this.y - this._y;
                this._y = n(this._y, this.y, this.CURSOR_TRANSLATE_LERP), Math.abs(o) < this.MIN_CURSOR_LERP_DELTA && (this._y = this.y)
            }
            if (this._rotateZ !== this.rotateZ) {
                e = !0;
                var u = this.rotateZ - this._rotateZ;
                this._rotateZ = n(this._rotateZ, this.rotateZ, this.CURSOR_ROTATE_LERP), Math.abs(u) < this.MIN_CURSOR_LERP_DELTA && (this._rotateZ = this.rotateZ)
            }
            e && t.updateTransform(this._x, this._y, this._rotateZ)
        },
        setCursorDown: function(e, t) {
            if (this.isDown) return;
            this.isDown = !0, this.downX = e, this.downY = t, this.setPosition(e, t), this.didDrag = !1
        },
        setCursorUp: function(e, t) {
            if (!this.isDown) return;
            this.isDown = !1, this.upX = e, this.upY = t, this.setPosition(e, t), this.dragDistance = r(this.upX - this.downX, this.upY - this.downY), this.didDrag = this.dragDistance >= this.MIN_DRAG_DISTANCE
        },
        setPosition: function(e, n) {
            this._x = this.x = e, this._y = this.y = n, t.updateTransform(e, n, 0)
        },
        setTargetPosition: function(e, t) {
            this.x = e, this.y = t
        },
        setActiveTilePosition: function(e, n) {
            t.updateCursorTransform(e, n)
        },
        setTouchMode: function(e) {
            this.isUsingTouch = e, e ? t.disable() : t.enable()
        }
    }
}), !r.placeModule("world", function(e) {
    var t = e("activity"),
        n = e("canvasse"),
        r = e("client");
    return {
        enabled: !0,
        drawTile: function(e, t, i) {
            var i = r.getPaletteColorABGR(i),
                s = n.getIndexFromCoords(e, t);
            r.state[s] = this.colorIndex, this.enabled ? n.drawTileAt(e, t, i) : n.drawTileToBuffer(e, t, i), r.receiveTile(e, t)
        },
        updateActivity: function(e) {
            t.setCount(e)
        },
        disable: function() {
            this.enabled = !1
        },
        enable: function() {
            this.enabled = !0
        }
    }
}), !r.placeModule("camerabuttonevents", function(e) {
    var t = e("jQuery"),
        n = e("client");
    return {
        click: function(e) {
            n.toggleAutoCamera()
        }
    }
}), !r.placeModule("cameraevents", function(e) {
    function i(e) {
        return {
            x: parseInt(e.clientX, 10) + window.scrollX,
            y: parseInt(e.clientY, 10) + window.scrollY
        }
    }
    var t = e("client"),
        n = e("cursor"),
        r = 69;
    return {
        container: {
            mousedown: function(e) {
                var t = i(e);
                n.setCursorDown(t.x, t.y)
            },
            mouseup: function(e) {
                var t = i(e);
                n.setCursorUp(t.x, t.y)
            },
            mousemove: function(e) {
                var r = i(e),
                    s = e.currentTarget ? e.currentTarget.offsetLeft : 0,
                    o = e.currentTarget ? e.currentTarget.offsetTop : 0,
                    u = t.getLocationFromCursorPosition(r.x - s, r.y - o),
                    a = t.getCursorPositionFromLocation(u.x, u.y);
                n.setActiveTilePosition(a.x + s, a.y + o);
                if (!n.isDown) {
                    n.setTargetPosition(r.x, r.y);
                    return
                }
                t.interact();
                var f = (n.x - n.downX) / t.zoom,
                    l = (n.y - n.downY) / t.zoom;
                n.setPosition(r.x, r.y);
                if (!t.isPanEnabled) return;
                var c = (r.x - n.downX) / t.zoom,
                    h = (r.y - n.downY) / t.zoom;
                t.setOffset(t.panX - f + c, t.panY - l + h)
            }
        },
        document: {
            keydown: function(e) {
                e.which === r && t.toggleZoom()
            }
        }
    }
}), !r.placeModule("canvasevents", function(e) {
    var t = e("client"),
        n = e("cursor");
    return {
        mouseup: function(e) {
            if (e.which === 3) return;
            var r = Math.round(e.offsetX),
                i = Math.round(e.offsetY);
            if (n.didDrag) return;
            if (!t.isZoomedIn) {
                var s = t.getOffsetFromCameraLocation(r, i);
                t.toggleZoom(s.x, s.y)
            } else t.hasColor() ? t.drawTile(r, i) : t.inspectTile(r, i)
        },
        contextmenu: function(e) {
            e.preventDefault();
            if (t.hasColor()) {
                t.clearColor();
                return
            }
            var n = Math.round(e.offsetX),
                r = Math.round(e.offsetY),
                i = t.getOffsetFromCameraLocation(n, r);
            t.toggleZoom(i.x, i.y)
        }
    }
}), !r.placeModule("mutebuttonevents", function(e) {
    var t = e("jQuery"),
        n = e("client");
    return {
        click: function(e) {
            n.toggleVolume()
        }
    }
}), !r.placeModule("notificationbuttonevents", function(e) {
    var t = e("jQuery"),
        n = e("client");
    return {
        click: function(e) {
            n.toggleNotificationButton()
        }
    }
}), !r.placeModule("paletteevents", function(e) {
    var t = e("jQuery"),
        n = e("client");
    return {
        click: function(e) {
            var r = t(e.target).data("color");
            typeof r != "undefined" && n.setColor(r)
        }
    }
}), !r.placeModule("websocketevents", function(e) {
    var t = e("world");
    return {
        connecting: function() {
            console.log("connecting")
        },
        connected: function() {
            console.log("connected")
        },
        disconnected: function() {
            console.log("disconnected")
        },
        reconnecting: function(e) {
            console.log("reconnecting in " + e + " seconds...")
        },
        "message:place": function(e) {
            t.drawTile(e.x, e.y, e.color)
        },
        "message:batch-place": function(e) {
            Array.isArray(e) && e.forEach(function(e) {
                t.drawTile(e.x, e.y, e.color)
            })
        },
        "message:activity": function(e) {
            e.count && t.updateActivity(e.count)
        }
    }
}), !r.placeModule("zoombuttonevents", function(e) {
    var t = e("jQuery"),
        n = e("client"),
        r = e("zoombutton");
    return {
        click: function(e) {
            n.toggleZoom(), n.setZoomButtonClicked(1), r.highlight(!1)
        }
    }
});