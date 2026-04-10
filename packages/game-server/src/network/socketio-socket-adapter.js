/**
 * Socket.IO implementation of ISocketAdapter for server-side sockets
 */
export class SocketIOSocketAdapter {
    constructor(socket) {
        this.socket = socket;
    }
    emit(event, ...args) {
        return this.socket.emit(event, ...args);
    }
    on(event, listener) {
        this.socket.on(event, listener);
        return this;
    }
    disconnect(close) {
        this.socket.disconnect(close);
        return this;
    }
    get id() {
        var _a;
        return (_a = this.socket.id) !== null && _a !== void 0 ? _a : "";
    }
    get handshake() {
        return {
            query: this.socket.handshake.query,
        };
    }
    /**
     * Get the underlying Socket.IO socket (for cases where direct access is needed)
     */
    getUnderlyingSocket() {
        return this.socket;
    }
}
