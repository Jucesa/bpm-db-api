require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10');
const PORT = process.env.PORT || 3000;

// Conexão com o banco
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // necessário para Neon/Supabase/Render
});

// ===== ROTAS =====

// Criar usuário
app.post('/usuarios', async (req, res) => {
    const { nomeCompleto, email, telefone, instituicao, areaConhecimento, senha } = req.body;

    if (!nomeCompleto || !email || !senha)
        return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios.' });

    try {
        const client = await pool.connect();

        const result = await client.query('SELECT id FROM usuarios WHERE email=$1', [email]);
        if (result.rows.length > 0) {
            client.release();
            return res.status(400).json({ erro: 'Email já cadastrado.' });
        }

        const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
        const insertQuery = `
      INSERT INTO usuarios (nomeCompleto, email, telefone, instituicao, areaConhecimento, senha)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nomeCompleto, email, telefone, instituicao, areaConhecimento
    `;
        const insertResult = await client.query(insertQuery, [
            nomeCompleto, email, telefone, instituicao, areaConhecimento, senhaHash
        ]);

        client.release();

        res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!', usuario: insertResult.rows[0] });

    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Listar usuários
app.get('/usuarios', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT id, nomeCompleto, email, telefone, instituicao, areaConhecimento FROM usuarios');
        client.release();
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Buscar 1 usuário
app.get('/usuarios/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT id, nomeCompleto, email, telefone, instituicao, areaConhecimento FROM usuarios WHERE id=$1',
            [id]
        );
        client.release();

        if (result.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Atualizar usuário
app.put('/usuarios/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { nomeCompleto, email, telefone, instituicao, areaConhecimento, senha } = req.body;

    try {
        const client = await pool.connect();

        let senhaHash = null;
        if (senha) senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

        const updateQuery = `
      UPDATE usuarios SET
        nomeCompleto = COALESCE($1, nomeCompleto),
        email = COALESCE($2, email),
        telefone = COALESCE($3, telefone),
        instituicao = COALESCE($4, instituicao),
        areaConhecimento = COALESCE($5, areaConhecimento),
        senha = COALESCE($6, senha)
      WHERE id = $7
      RETURNING id, nomeCompleto, email, telefone, instituicao, areaConhecimento
    `;
        const result = await client.query(updateQuery, [
            nomeCompleto, email, telefone, instituicao, areaConhecimento, senhaHash, id
        ]);

        client.release();

        if (result.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
        res.json({ mensagem: 'Usuário atualizado.', usuario: result.rows[0] });

    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Remover usuário
app.delete('/usuarios/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        const client = await pool.connect();
        const result = await client.query('DELETE FROM usuarios WHERE id=$1 RETURNING id', [id]);
        client.release();

        if (result.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
        res.json({ mensagem: 'Usuário removido com sucesso.' });

    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// ===== Iniciar servidor =====
app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
