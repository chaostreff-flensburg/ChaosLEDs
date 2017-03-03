#!/bin/sh
ssh pi@10.9.0.2 <<EOF
  cd /home/pi/Desktop/Projekte/ChaosLEDs
  git pull
  sudo npm install -y
  exit
EOF
