require('dotenv').config(); // Carrega variáveis do .env
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { accelerate } = require('@prisma/extension-accelerate');

const app = express();
app.use(cors());
app.use(express.json());



const prisma = new PrismaClient().$extends(accelerate({
    // opção opcional: cache ttl em ms
    ttl: 5000
}));

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10');

// ===== ROTAS =====

// (1) Criar usuário
app.post('/usuarios', async (req, res) => {
    const { nomeCompleto, email, telefone, instituicao, areaConhecimento, senha } = req.body;

    if (!nomeCompleto || !email || !senha) {
        return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios.' });
    }

    try {
        const existente = await prisma.usuario.findUnique({ where: { email } });
        if (existente) return res.status(400).json({ erro: 'Email já cadastrado.' });

        const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

        const novoUsuario = await prisma.usuario.create({
            data: { nomeCompleto, email, telefone, instituicao, areaConhecimento, senha: senhaHash }
        });

        res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!', usuario: novoUsuario });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// (2) Listar usuários (sem senha)
app.get('/usuarios', async (req, res) => {
    const usuarios = await prisma.usuario.findMany({
        select: { id: true, nomeCompleto: true, email: true, telefone: true, instituicao: true, areaConhecimento: true }
    });
    res.json(usuarios);
});

// (3) Buscar 1 usuário (sem senha)
app.get('/usuarios/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const usuario = await prisma.usuario.findUnique({
        where: { id },
        select: { id: true, nomeCompleto: true, email: true, telefone: true, instituicao: true, areaConhecimento: true }
    });

    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json(usuario);
});

// (4) Atualizar usuário
app.put('/usuarios/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { nomeCompleto, email, telefone, instituicao, areaConhecimento, senha } = req.body;

    try {
        const dataAtualizacao = { nomeCompleto, email, telefone, instituicao, areaConhecimento };

        if (senha) dataAtualizacao.senha = await bcrypt.hash(senha, SALT_ROUNDS);

        const usuarioAtualizado = await prisma.usuario.update({ where: { id }, data: dataAtualizacao });

        res.json({
            mensagem: 'Usuário atualizado.',
            usuario: {
                id: usuarioAtualizado.id,
                nomeCompleto: usuarioAtualizado.nomeCompleto,
                email: usuarioAtualizado.email,
                telefone: usuarioAtualizado.telefone,
                instituicao: usuarioAtualizado.instituicao,
                areaConhecimento: usuarioAtualizado.areaConhecimento
            }
        });
    } catch (error) {
        res.status(404).json({ erro: 'Usuário não encontrado ou erro ao atualizar.' });
    }
});

// (5) Remover usuário
app.delete('/usuarios/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        await prisma.usuario.delete({ where: { id } });
        res.json({ mensagem: 'Usuário removido com sucesso.' });
    } catch (error) {
        res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
});

// ===== Iniciar servidor =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
