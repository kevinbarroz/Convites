import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function ConvitesDigitais() {
  // Estados
  const [supabase, setSupabase] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('criar');
  const [convites, setConvites] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    titulo: '',
    dataEvento: '',
    local: '',
    descricao: '',
    organizador: '',
    whatsapp: '',
    cor: 'roxo',
    fonte: 'elegante'
  });
  
  const [selectedImages, setSelectedImages] = useState([]);
  
  // Estados de configuração do Supabase
  const [supabaseConfig, setSupabaseConfig] = useState({
    url: '',
    key: ''
  });

  // Conectar ao Supabase
  const connectSupabase = async () => {
    if (!supabaseConfig.url || !supabaseConfig.key) {
      showMessage('error', 'Por favor, preencha a URL e a chave do Supabase.');
      return;
    }

    try {
      const supabaseClient = createClient(supabaseConfig.url, supabaseConfig.key);
      
      // Testar conexão
      const { data, error } = await supabaseClient.from('convites').select('count').limit(1);
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSupabase(supabaseClient);
      setIsConnected(true);
      showMessage('success', 'Supabase conectado com sucesso! 🚀');
      loadConvites(supabaseClient);
      
    } catch (error) {
      console.error('Erro ao conectar:', error);
      showMessage('error', 'Erro na conexão: ' + (error.message || 'Verifique suas credenciais'));
    }
  };

  // Mostrar mensagens
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Manipular mudanças no formulário
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manipular seleção de imagens
  const handleImageSelection = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        showMessage('error', `Imagem ${file.name} é muito grande. Máximo 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = function(event) {
        setSelectedImages(prev => [...prev, {
          file: file,
          url: event.target.result,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remover imagem
  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Criar convite
  const criarConvite = async () => {
    if (!supabase) {
      showMessage('error', 'Configure o Supabase primeiro!');
      return;
    }

    // Validação
    if (!formData.titulo || !formData.dataEvento || !formData.local || !formData.organizador) {
      showMessage('error', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);

    try {
      // Preparar URLs das imagens (base64 para simplificar)
      const imagensBase64 = selectedImages.map(img => img.url);

      // Dados do convite
      const conviteData = {
        titulo: formData.titulo,
        data_evento: formData.dataEvento,
        local: formData.local,
        descricao: formData.descricao,
        organizador: formData.organizador,
        whatsapp: formData.whatsapp,
        cor: formData.cor,
        fonte: formData.fonte,
        imagens: imagensBase64,
        visualizacoes: 0
      };

      // Salvar no Supabase
      const { data, error } = await supabase
        .from('convites')
        .insert([conviteData])
        .select();

      if (error) throw error;
      
      showMessage('success', 'Convite criado com sucesso! 🎉');
      
      // Limpar formulário
      setFormData({
        titulo: '',
        dataEvento: '',
        local: '',
        descricao: '',
        organizador: '',
        whatsapp: '',
        cor: 'roxo',
        fonte: 'elegante'
      });
      setSelectedImages([]);
      
      // Ir para a aba de convites
      setActiveTab('meus');
      await loadConvites();
      
    } catch (error) {
      console.error('Erro ao criar convite:', error);
      showMessage('error', 'Erro ao criar convite: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Carregar convites
  const loadConvites = async (supabaseClient = supabase) => {
    if (!supabaseClient) return;

    try {
      const { data: convitesData, error } = await supabaseClient
        .from('convites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConvites(convitesData || []);
      
    } catch (error) {
      console.error('Erro ao carregar convites:', error);
      showMessage('error', 'Erro ao carregar convites: ' + error.message);
    }
  };

  // Visualizar convite
  const verConvite = async (conviteId) => {
    if (!supabase) return;

    try {
      // Buscar dados do convite
      const { data: convite, error } = await supabase
        .from('convites')
        .select('*')
        .eq('id', conviteId)
        .single();

      if (error) throw error;

      // Abrir convite em nova janela
      const conviteWindow = window.open('', '_blank');
      conviteWindow.document.write(gerarHTMLConvite(convite));
      conviteWindow.document.close();
      
      // Incrementar visualizações
      await supabase
        .from('convites')
        .update({ visualizacoes: (convite.visualizacoes || 0) + 1 })
        .eq('id', conviteId);
      
      // Recarregar lista
      loadConvites();
      
    } catch (error) {
      console.error('Erro ao visualizar convite:', error);
      showMessage('error', 'Erro ao abrir convite: ' + error.message);
    }
  };

  // Gerar HTML do convite
  const gerarHTMLConvite = (convite) => {
    const cores = {
      roxo: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      rosa: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      azul: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      verde: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      laranja: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      pastel: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    };

    const fontes = {
      elegante: "'Times New Roman', serif",
      moderna: "'Arial', sans-serif",
      divertida: "'Comic Sans MS', cursive"
    };

    const dataFormatada = new Date(convite.data_evento).toLocaleString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const imagensHTML = convite.imagens && convite.imagens.length > 0 
      ? convite.imagens.map(img => `<img src="${img}" alt="Imagem do evento" style="width: 100%; max-width: 400px; border-radius: 15px; margin: 10px 0; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">`).join('')
      : '';

    const whatsappLink = convite.whatsapp 
      ? `https://wa.me/55${convite.whatsapp.replace(/\D/g, '')}?text=Oi! Recebi seu convite para ${encodeURIComponent(convite.titulo)}. Gostaria de confirmar minha presença!`
      : '';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${convite.titulo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: ${fontes[convite.fonte]};
            background: ${cores[convite.cor]};
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .convite-container {
            background: white;
            border-radius: 25px;
            padding: 40px;
            max-width: 600px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            animation: fadeIn 1s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .titulo {
            font-size: 2.5rem;
            color: #333;
            margin-bottom: 20px;
            background: ${cores[convite.cor]};
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .info {
            font-size: 1.2rem;
            color: #555;
            margin: 15px 0;
            padding: 10px;
            border-left: 4px solid;
            border-image: ${cores[convite.cor]} 1;
            text-align: left;
        }
        .descricao {
            font-size: 1.1rem;
            color: #666;
            margin: 20px 0;
            line-height: 1.6;
            font-style: italic;
        }
        .whatsapp-btn {
            display: inline-block;
            background: #25D366;
            color: white;
            padding: 15px 30px;
            border-radius: 50px;
            text-decoration: none;
            font-size: 1.1rem;
            font-weight: bold;
            margin-top: 30px;
            transition: transform 0.2s;
        }
        .whatsapp-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(37, 211, 102, 0.4);
        }
        .organizador {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #eee;
            color: #777;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="convite-container">
        <h1 class="titulo">🎉 ${convite.titulo}</h1>
        <div class="info"><strong>📅 Data:</strong> ${dataFormatada}</div>
        <div class="info"><strong>📍 Local:</strong> ${convite.local}</div>
        ${convite.descricao ? `<div class="descricao">"${convite.descricao}"</div>` : ''}
        <div class="imagens">${imagensHTML}</div>
        ${whatsappLink ? `<a href="${whatsappLink}" class="whatsapp-btn" target="_blank">💬 Confirmar Presença via WhatsApp</a>` : ''}
        <div class="organizador">Organizado por: <strong>${convite.organizador}</strong></div>
    </div>
</body>
</html>`;
  };

  return (
    <div style={{
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: '#333'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px', color: 'white' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            ✨ Convites Digitais
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            Crie convites incríveis em minutos com Supabase
          </p>
        </div>

        {/* Setup do Supabase */}
        {!isConnected && (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '15px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h3 style={{ color: '#856404', marginBottom: '15px' }}>
              🚀 Configuração do Supabase (Super Fácil!)
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#856404' }}>
                URL do Projeto:
              </label>
              <input
                type="url"
                value={supabaseConfig.url}
                onChange={(e) => setSupabaseConfig(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://seu-projeto.supabase.co"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '10px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#856404' }}>
                Chave Pública (anon key):
              </label>
              <input
                type="text"
                value={supabaseConfig.key}
                onChange={(e) => setSupabaseConfig(prev => ({ ...prev, key: e.target.value }))}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '10px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <button
              onClick={connectSupabase}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '15px 30px',
                border: 'none',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%'
              }}
            >
              🔗 Conectar Supabase
            </button>
          </div>
        )}

        {/* Mensagens */}
        {message.text && (
          <div style={{
            background: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '20px',
            border: message.type === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb'
          }}>
            {message.text}
          </div>
        )}

        {/* Interface principal continua... */}
        {isConnected && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h2>🎉 Sistema funcionando! Configure seus convites aqui.</h2>
            <p>Interface completa será adicionada na próxima versão...</p>
          </div>
        )}
      </div>
    </div>
  );
}
