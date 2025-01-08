if [ ! -d "hazelcast" ]
then
  wget -O hazelcast.zip 'https://github.com/hazelcast/hazelcast/releases/download/v5.4.0/hazelcast-5.4.0-slim.zip'
  unzip hazelcast.zip
  mv hazelcast-5.4.0-slim hazelcast
  rm hazelcast.zip
fi
