
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

// ========================================
// CONFIGURAÇÕES
// ========================================

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// ========================================
// SUPABASE
// ========================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ========================================
// ROTA PRINCIPAL
// ========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API de Lista de Tarefas funcionando!",
    version: "1.0.0",
    endpoints: {
      listar: "GET /tasks",
      buscar: "GET /tasks/:id",
      criar: "POST /tasks",
      atualizar: "PUT /tasks/:id",
      concluir: "PATCH /tasks/:id",
      excluir: "DELETE /tasks/:id"
    }
  });
});

// ========================================
// READ - LISTAR TAREFAS
// ========================================

app.get("/tasks", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      total: data.length,
      tasks: data
    });

  } catch (error) {
    console.error("Erro ao listar tarefas:", error.message);

    return res.status(500).json({
      success: false,
      message: "Erro ao listar tarefas.",
      error: error.message
    });
  }
});

// ========================================
// READ - BUSCAR TAREFA POR ID
// ========================================

app.get("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "ID inválido."
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Tarefa não encontrada."
      });
    }

    return res.status(200).json({
      success: true,
      task: data
    });

  } catch (error) {
    console.error("Erro ao buscar tarefa:", error.message);

    return res.status(500).json({
      success: false,
      message: "Erro ao buscar tarefa.",
      error: error.message
    });
  }
});

// ========================================
// CREATE - CRIAR TAREFA
// ========================================

app.post("/tasks", async (req, res) => {
  try {
    const { title } = req.body || {};

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "O título da tarefa é obrigatório."
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: title.trim(),
        completed: false
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Tarefa criada com sucesso!",
      task: data
    });

  } catch (error) {
    console.error("Erro ao criar tarefa:", error.message);

    return res.status(500).json({
      success: false,
      message: "Erro ao criar tarefa.",
      error: error.message
    });
  }
});

// ========================================
// UPDATE - ATUALIZAR TAREFA
// ========================================

app.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, completed } = req.body || {};

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "ID inválido."
      });
    }

    const updates = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Informe um título válido."
        });
      }

      updates.title = title.trim();
    }

    if (completed !== undefined) {
      if (typeof completed !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "O campo completed deve ser booleano."
        });
      }

      updates.completed = completed;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Informe title ou completed para atualizar."
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Tarefa não encontrada."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tarefa atualizada com sucesso!",
      task: data
    });

  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error.message);

    return res.status(500).json({
      success: false,
      message: "Erro ao atualizar tarefa.",
      error: error.message
    });
  }
});

// ========================================
// PATCH - CONCLUIR OU REABRIR TAREFA
// ========================================

app.patch("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body || {};

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "ID inválido."
      });
    }

    if (typeof completed !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Informe completed como true ou false."
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({ completed })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Tarefa não encontrada."
      });
    }

    return res.status(200).json({
      success: true,
      message: completed
        ? "Tarefa concluída!"
        : "Tarefa reaberta!",
      task: data
    });

  } catch (error) {
    console.error("Erro ao alterar conclusão:", error.message);

    return res.status(500).json({
      success: false,
      message: "Erro ao alterar conclusão.",
      error: error.message
    });
  }
});

// ========================================
// DELETE - EXCLUIR TAREFA
// ========================================

app.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "ID inválido."
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Tarefa não encontrada."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tarefa excluída com sucesso!",
      task: data
    });

  } catch (error) {
    console.error("Erro ao excluir tarefa:", error.message);

    return res.status(500).json({
      success: false,
      message: "Erro ao excluir tarefa.",
      error: error.message
    });
  }
});

// ========================================
// TRATAMENTO DE ROTAS INEXISTENTES
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Rota não encontrada."
  });
});

// ========================================
// EXPORTAÇÃO PARA VERCEL
// ========================================

export default app;
