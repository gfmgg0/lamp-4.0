'use client';

import { useEffect, useState, useRef } from 'react';
import mqtt from 'mqtt';

export default function ViewerPage() {
  const [isOn, setIsOn] = useState(false);
  const [lastUser, setLastUser] = useState('Ninguém');
  const [totalOnTime, setTotalOnTime] = useState(0); // in seconds
  const [sessionStartTime, setSessionStartTime] = useState(null); // when it turned ON
  
  const mqttClientRef = useRef(null);
  
  const MQTT_TOPIC = 'lamp4.0/secure/c8d7e9f1-4b2a-8c5d-9e6f-1a2b3c4d5e6f';

  // Fetch initial state
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setIsOn(data.state === 1);
            setLastUser(data.user || 'Desconhecido');
            if (data.state === 1 && data.createdAt) {
              setSessionStartTime(new Date(data.createdAt).getTime());
            } else {
              setSessionStartTime(null);
              setTotalOnTime(0);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch state:', err);
      }
    };
    
    fetchState();
  }, []);

  // MQTT Connection
  useEffect(() => {
    const client = mqtt.connect('wss://mqtt-dashboard.com:8884/mqtt', {
      clientId: 'clientId-pK8A0blhZT-' + Math.random().toString(16).substring(2, 8),
      username: 'Lamp4.0',
      password: 'L@mp4.O',
      keepalive: 60,
      clean: true,
    });

    client.on('connect', () => {
      console.log('Connected to MQTT via WSS');
      client.subscribe(MQTT_TOPIC, { qos: 0 });
    });

    client.on('message', (topic, message) => {
      if (topic === MQTT_TOPIC) {
        const msg = message.toString();
        const turnOn = msg === '1';
        
        setIsOn(turnOn);
        
        // When state changes via MQTT, we also fetch the DB to get the user who changed it
        // We add a slight delay to allow the DB to be updated by the controller before fetching
        setTimeout(async () => {
          try {
             const res = await fetch('/api/state');
             if (res.ok) {
               const data = await res.json();
               setLastUser(data.user || 'Desconhecido');
               if (turnOn) {
                 const start = (data.state === 1 && data.createdAt) ? new Date(data.createdAt).getTime() : Date.now();
                 setSessionStartTime(start);
               } else if (!turnOn) {
                 setSessionStartTime(null);
                 setTotalOnTime(0);
               }
             }
          } catch(e) {}
        }, 500);
      }
    });

    mqttClientRef.current = client;

    return () => {
      if (client) {
        client.end();
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    let interval = null;
    
    if (isOn && sessionStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const diffInSeconds = Math.floor((now - sessionStartTime) / 1000);
        setTotalOnTime(diffInSeconds > 0 ? diffInSeconds : 0);
      }, 1000);
    } else {
      setTotalOnTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOn, sessionStartTime]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-col items-center justify-center animate-fade-in" style={{ minHeight: '80vh', display: 'flex' }}>
      <h1 className="text-gradient mb-4" style={{ fontSize: '3rem', fontWeight: 700 }}>Visualizador</h1>
      
      <div className="glass-panel text-center" style={{ minWidth: '400px' }}>
        
        <div className="lamp-container mb-4">
          <div className={`lamp-bulb ${isOn ? 'on' : ''}`}></div>
        </div>
        
        <h2 className="mb-2" style={{ fontSize: '1.5rem' }}>
          Estado: <span style={{ color: isOn ? 'var(--lamp-on)' : 'var(--text-muted)' }}>{isOn ? 'Acesa' : 'Apagada'}</span>
        </h2>
        
        <div className="mb-4">
          <p className="mb-1 text-muted">Último a alterar:</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{lastUser}</p>
        </div>
        
        <div>
          <p className="mb-1 text-muted">Tempo Ligada (Total da Sessão):</p>
          <div className="timer-box">
            {isOn ? formatTime(totalOnTime) : '00:00:00'}
          </div>
        </div>
      </div>
    </div>
  );
}
