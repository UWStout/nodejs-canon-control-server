openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout server.key -out server.crt \
  -config dev_certificate.cnf -extensions v3_req
