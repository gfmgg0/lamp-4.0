'use client';

import { useEffect, useState, useRef } from 'react';
import mqtt from 'mqtt';

export default function ControllerPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  // Auth Form State
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Controller State
  const [isOn, setIsOn] = useState(false);
  const [totalOnTime, setTotalOnTime] = useState(0); // in seconds
  const [myOnTime, setMyOnTime] = useState(0); // time the light is ON and I was the one who turned it ON
  const [lastUser, setLastUser] = useState('');
  
  const mqttClientRef = useRef(null);
  const MQTT_TOPIC = 'lamp4.0/secure/c8d7e9f1-4b2a-8c5d-9e6f-1a2b3c4d5e6f';

  // Check auth
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) {
          return res.json().then(data => {
            setIsAuthenticated(true);
            setUser(data.user);
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (!isLogin) {
          // If registered, switch to login
          setIsLogin(true);
          setAuthError('Cadastrado com sucesso! Faça login.');
        } else {
          setIsAuthenticated(true);
          setUser({ username });
        }
      } else {
        setAuthError(data.error || 'Erro na autenticação');
      }
    } catch (err) {
      setAuthError('Erro de conexão');
    }
  };

  // Fetch initial state
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchState = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setIsOn(data.state === 1);
            setLastUser(data.user || '');
            
            if (data.state === 1) {
              setTotalOnTime(data.elapsedSeconds || 0);
              if (user && data.user === user.username) {
                setMyOnTime(data.elapsedSeconds || 0);
              } else {
                setMyOnTime(0);
              }
            } else {
              setTotalOnTime(0);
              setMyOnTime(0);
            }
          }
        }
      } catch (err) {}
    };
    
    fetchState();
  }, [isAuthenticated, user]);

  // MQTT Connection
  useEffect(() => {
    if (!isAuthenticated) return;

    const client = mqtt.connect('wss://mqtt-dashboard.com:8884/mqtt', {
      clientId: 'clientId-pK8A0blhZT-' + Math.random().toString(16).substring(2, 8),
      username: 'Lamp4.0',
      password: 'L@mp4.O',
      keepalive: 60,
      clean: true,
    });

    client.on('connect', () => {
      client.subscribe(MQTT_TOPIC, { qos: 0 });
    });

    client.on('message', (topic, message) => {
      if (topic === MQTT_TOPIC) {
        const msg = message.toString();
        const turnOn = msg === '1';
        
        setIsOn(turnOn);
        
        setTimeout(async () => {
          try {
             const res = await fetch('/api/state');
             if (res.ok) {
               const data = await res.json();
               setLastUser(data.user || '');
               if (turnOn) {
                 setTotalOnTime(data.elapsedSeconds || 0);
                 if (user && data.user === user.username) {
                   setMyOnTime(data.elapsedSeconds || 0);
                 } else {
                   setMyOnTime(0);
                 }
               } else if (!turnOn) {
                 setTotalOnTime(0);
                 setMyOnTime(0);
               }
             }
          } catch(e) {}
        }, 500);
      }
    });

    mqttClientRef.current = client;

    return () => {
      if (client) client.end();
    };
  }, [isAuthenticated, user]);

  // Timers
  useEffect(() => {
    let interval = null;
    
    if (isOn) {
      interval = setInterval(() => {
        setTotalOnTime(prev => prev + 1);
        if (user && lastUser === user.username) {
          setMyOnTime(prev => prev + 1);
        }
      }, 1000);
    } else {
      setTotalOnTime(0);
      setMyOnTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOn, lastUser, user]);

  const toggleSwitch = async () => {
    const newState = !isOn;
    setIsOn(newState);
    
    // Publish to MQTT
    if (mqttClientRef.current) {
      mqttClientRef.current.publish(MQTT_TOPIC, newState ? '1' : '0', { qos: 0, retain: false });
    }
    
    // Update Database
    try {
      await fetch('/api/state/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState ? 1 : 0 })
      });
    } catch(e) {}
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex-col items-center justify-center animate-fade-in" style={{ minHeight: '80vh', display: 'flex' }}>
        <h1 className="text-gradient mb-4" style={{ fontSize: '3rem', fontWeight: 700 }}>Controlador Lamp 4.0</h1>
        <div className="glass-panel" style={{ width: '350px' }}>
          <h2 className="mb-4 text-center">{isLogin ? 'Login' : 'Cadastro'}</h2>
          {authError && <p style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center' }}>{authError}</p>}
          <form onSubmit={handleAuth} className="flex-col gap-4">
            <input 
              type="text" 
              placeholder="Usuário" 
              className="input-field" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
            />
            <input 
              type="password" 
              placeholder="Senha" 
              className="input-field" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
            <button type="submit" className="btn-primary mt-4">
              {isLogin ? 'Entrar' : 'Cadastrar'}
            </button>
          </form>
          <p className="mt-4 text-center text-muted" style={{ cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col items-center justify-center animate-fade-in" style={{ minHeight: '80vh', display: 'flex' }}>
      <h1 className="text-gradient mb-2" style={{ fontSize: '3rem', fontWeight: 700 }}>Interruptor</h1>
      <p className="mb-4 text-muted">Logado como: <strong>{user?.username}</strong></p>
      
      <div className="glass-panel text-center" style={{ minWidth: '400px' }}>
        
        <div className="switch-wrapper">
          <div className="switch-body">
            <div className={`switch-toggle ${isOn ? 'on' : ''}`} onClick={toggleSwitch}>
              <span className="switch-label top">ON</span>
              <span className="switch-label bottom">OFF</span>
            </div>
          </div>
        </div>
        
        <div className="mb-4" style={{ marginTop: '2rem' }}>
          <p className="mb-1 text-muted">Tempo Lâmpada Ligada (Total):</p>
          <div className="timer-box">
            {isOn ? formatTime(totalOnTime) : '00:00:00'}
          </div>
        </div>

        <div>
          <p className="mb-1 text-muted">Seu Tempo Ligada (Atuação Atual):</p>
          <div className="timer-box" style={{ borderColor: myOnTime > 0 ? 'var(--primary)' : 'var(--glass-border)' }}>
            {isOn && lastUser === user?.username ? formatTime(myOnTime) : '00:00:00'}
          </div>
        </div>

      </div>
    </div>
  );
}
