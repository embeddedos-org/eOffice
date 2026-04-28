#!/bin/bash
# Generate self-signed TLS cert for development/testing
openssl req -x509 -nodes -days 365 -newkey rsa:2048   -keyout eoffice.key -out eoffice.crt   -subj "/CN=eoffice.local/O=eOffice/C=US"
echo "Generated self-signed cert: eoffice.crt + eoffice.key"
echo "For production, replace with certs from Let's Encrypt or your CA."
