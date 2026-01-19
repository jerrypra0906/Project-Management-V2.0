# SSL certificates go here

Place your **provided TLS certificate files** in this directory on the **frontend server**:

`/opt/Project-Management-V2.0/assets/ssl`

The `frontend` nginx container mounts this folder at `/etc/nginx/ssl` and expects:

- `fullchain.pem` (certificate + intermediate chain)
- `privkey.pem` (private key)

Optional:
- `chain.pem` (intermediate chain only)

If your provider gave you `.crt` / `.key` files instead, rename/convert them to the `.pem` files above (most `.crt` are already PEM).


