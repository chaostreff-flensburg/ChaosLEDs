#!/bin/sh

#deploy master server
cd /home/jonas/ChaosLEDs
git pull
cd server
npm install -y
forever restartall

#deploy led client
ssh pi@10.9.0.2 <<EOF
  cd /home/pi/Desktop/Projekte/ChaosLEDs
  git pull
  cd client
  sudo npm install -g -y
  sudo forever restartall
  exit
EOF
