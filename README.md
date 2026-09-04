# 🍾 Control Embotelladora - HMI & SCADA System

Sistema de supervisión y control (HMI/SCADA) para una planta de embotellado automatizada. Proyecto desarrollado con una arquitectura desacoplada utilizando un backend robusto en FastAPI (Python) para la lógica de proceso/simulación y un frontend interactivo en React para el panel de interfaz hombre-máquina (HMI).

---

## 🛠️ Tecnologías Utilizadas

- Backend: Python 3.10+, FastAPI, Uvicorn, Pydantic.
- Frontend: React, Vite, JavaScript (ES6+), CSS3 / Tailwind CSS.
- Control de Versiones: Git, GitHub.

---

## 📋 Prerrequisitos

Asegúrate de tener instalado en tu sistema:

- Python 3.10+ (https://www.python.org/downloads/)
- Node.js 18+ (https://nodejs.org/) y npm
- Git (https://git-scm.com/)

---

## 🚀 Guía de Instalación y Ejecución

Sigue las instrucciones a continuación para clonar y ejecutar la aplicación de manera local en tu máquina.

### 1. Clonar el Repositorio

git clone https://github.com/ivannruizd/Control-Embotelladora.git
cd Control-Embotelladora

---

### 2. Configuración del Backend (FastAPI)

1. Abre una terminal y navega al directorio del backend:
   cd backend

2. Crea un entorno virtual de Python:
   python -m venv venv

3. Activa el entorno virtual:
   - Windows (Git Bash):
     source venv/Scripts/activate
   - Windows (PowerShell):
     .\venv\Scripts\Activate.ps1
   - Linux / macOS:
     source venv/bin/activate

4. Instala las dependencias:
   pip install -r requirements.txt

5. Inicia el servidor de FastAPI:
   uvicorn main:app --reload

   Servidor backend: http://127.0.0.1:8000
   Documentación interactiva (Swagger UI): http://127.0.0.1:8000/docs

---

### 3. Configuración del Frontend (React + Vite)

1. Abre otra ventana o pestaña de terminal y navega a la carpeta del frontend:
   cd frontend

2. Instala los paquetes de Node.js:
   npm install

3. Inicia el servidor de desarrollo del frontend:
   npm run dev

   Aplicación en navegador: http://localhost:5173

---

## 📂 Estructura del Proyecto

Control-Embotelladora/
├── backend/            # API REST y simulación de control en FastAPI
│   ├── main.py         # Punto de entrada de FastAPI
│   ├── requirements.txt
│   └── ...
├── frontend/           # Interfaz gráfica HMI en React
│   ├── src/            # Componentes, vistas y lógica del panel
│   ├── package.json
│   └── ...
├── .gitignore
└── README.md

---

## 👤 Autor

Desarrollado por Edgar Ivann Ruiz Domínguez
GitHub: https://github.com/ivannruizd
