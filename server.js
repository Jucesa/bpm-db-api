const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();
const SALT_ROUNDS = 10; // para bcrypt

// (1) Criar usuário
app.post("/usuarios", async (req, res) => {
    const { nomeCompleto, email, telefone, instituicao, areaConhecimento, senha } = req.body;

    if (!nomeCompleto || !email || !senha) {
        return res.status(400).json({ erro: "Nome, email e senha são obrigatórios." });
    }

    try {
        // Verificar se email já existe
        const existente = await prisma.usuario.findUnique({ where: { email } });
        if (existente) {
            return res.status(400).json({ erro: "Email já cadastrado." });
        }

        // Hash da senha
        const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

        const novoUsuario = await prisma.usuario.create({
            data: {
                nomeCompleto,
                email,
                telefone,
                instituicao,
                areaConhecimento,
                senha: senhaHash
            }
        });

        res.status(201).json({
            mensagem: "Usuário cadastrado com sucesso!",
            usuario: novoUsuario
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// (2) Listar usuários (não retorna senha)
app.get("/usuarios", async (req, res) => {
    const usuarios = await prisma.usuario.findMany({
        select: {
            id: true,
            nomeCompleto: true,
            email: true,
            telefone: true,
            instituicao: true,
            areaConhecimento: true
        }
    });
    res.json(usuarios);
});

// (3) Buscar 1 usuário (não retorna senha)
app.get("/usuarios/:id", async (req, res) => {
    const { id } = req.params;
    const usuario = await prisma.usuario.findUnique({
        where: { id: parseInt(id) },
        select: {
            id: true,
            nomeCompleto: true,
            email: true,
            telefone: true,
            instituicao: true,
            areaConhecimento: true
        }
    });

    if (!usuario) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.json(usuario);
});

// (4) Atualizar usuário
app.put("/usuarios/:id", async (req, res) => {
    const { id } = req.params;
    const { nomeCompleto, email, telefone, instituicao, areaConhecimento, senha } = req.body;

    try {
        // Se for atualizar a senha, hash novamente
        const dataAtualizacao = {
            nomeCompleto,
            email,
            telefone,
            instituicao,
            areaConhecimento
        };

        if (senha) {
            dataAtualizacao.senha = await bcrypt.hash(senha, SALT_ROUNDS);
        }

        const usuarioAtualizado = await prisma.usuario.update({
            where: { id: parseInt(id) },
            data: dataAtualizacao
        });

        res.json({
            mensagem: "Usuário atualizado.",
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
        res.status(404).json({ erro: "Usuário não encontrado ou erro ao atualizar." });
    }
});

// (5) Remover usuário
app.delete("/usuarios/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.usuario.delete({ where: { id: parseInt(id) } });
        res.json({ mensagem: "Usuário removido com sucesso." });
    } catch (error) {
        res.status(404).json({ erro: "Usuário não encontrado." });
    }
});

// ====== INICIAR SERVIDOR ==========
app.listen(3000, () => {
    console.log("API rodando em http://localhost:3000");
});