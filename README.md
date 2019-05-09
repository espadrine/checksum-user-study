# Checksum User Study

## Development

```
make run
```

## Settings

```json
{
  "http": {
    "hostname": "thefiletree.com",
    "port": 58623,
    "protocol": "https",
    "tls": {
      "key":  "/etc/letsencrypt/live/thefiletree.com/privkey.pem",
      "cert": "/etc/letsencrypt/live/thefiletree.com/cert.pem",
      "ca":  ["/etc/letsencrypt/live/thefiletree.com/fullchain.pem"
    },
    "cors": {
      "origins": [
        "https://thefiletree.com:58623"
      ]
    }
  }
}
```

## Installation

We assume your server has node, git and vim installed.

```bash
git clone https://github.com/espadrine/checksum-user-study.git
cd checksum-user-study
npm install
cp .dev-settings.json .settings.json
vim .settings.json
cp checksum-user-study.service /etc/systemd/system/
systemctl daemon-reload
systemctl start checksum-user-study.service
systemctl enable checksum-user-study.service
```
