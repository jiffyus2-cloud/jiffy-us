# 🎨 Photo Album Creator - Design System

Bienvenido al **Design System** oficial del Photo Album Creator App. Este repositorio centraliza la identidad visual, los componentes de interfaz y las reglas de diseño para garantizar una experiencia de usuario coherente y escalable.

## 🚀 Introducción

Este Design System nace con el objetivo de cerrar la brecha entre el diseño en Figma y el desarrollo técnico. Proporciona una biblioteca de componentes modulares, accesibles y altamente personalizables basados en **Atomic Design**, permitiendo a los equipos construir interfaces complejas de forma rápida y consistente.

## 🛠️ Stack Tecnológico

El sistema está construido sobre tecnologías modernas que priorizan el rendimiento y la experiencia de desarrollo:

* **Framework:** [Next.js 14+](https://nextjs.org/) (App Router) para una arquitectura de componentes robusta.
* **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/) para un desarrollo *utility-first* optimizado.
* **Diseño:** [Figma](https://www.figma.com/) como única fuente de verdad para los assets y prototipos.
* **Componentes Base:** [Radix UI](https://www.radix-ui.com/) para garantizar accesibilidad (WAI-ARIA) desde el núcleo.
* **Iconografía:** [Lucide React](https://lucide.dev/) para un set de iconos consistente y ligero.

---

## 💎 Estructura de Tokens

Nuestros Design Tokens están centralizados en `src/styles/design-system.ts` y se inyectan mediante variables CSS en el tema global.

### 🎨 Colores (Variables Dinámicas)

Utilizamos una paleta semántica que permite el soporte nativo para temas (Light/Dark mode):

| Token | Propiedad | Descripción |
| :--- | :--- | :--- |
| `primary` | `var(--primary)` | Color principal de la marca. |
| `secondary` | `var(--secondary)` | Color de acento secundario. |
| `background` | `var(--background)` | Fondo principal de la aplicación. |
| `foreground` | `var(--foreground)` | Color de texto principal. |
| `destructive` | `var(--destructive)` | Acciones críticas o estados de error. |
| `border` | `var(--border)` | Color estándar para bordes y separadores. |

### ✍️ Tipografía

La jerarquía tipográfica está definida para maximizar la legibilidad en diferentes dispositivos:

* **H1:** `text-5xl md:text-7xl font-medium` (Hero sections)
* **H2:** `text-5xl font-medium` (Títulos de sección)
* **Body:** `text-lg text-gray-600` (Texto de lectura principal)
* **Label:** `text-base font-medium` (Formularios y etiquetas)

### 📐 Layout y Bordes

* **Radius:** `sm` (2px), `md` (4px), `lg` (8px), `xl` (12px).
* **Shadows:** Implementación de sombras suaves (`sm` a `xl`) para elevación de componentes.

---

## 📖 Guía Rápida de Uso

### 1. Instalación de dependencias

Asegúrate de tener instaladas las dependencias del core:

```bash
npm install tailwind-merge clsx lucide-react class-variance-authority
```

### 2. Uso de Tokens de Diseño

Para mantener la consistencia, importa el objeto `DESIGN` para estilos complejos o usa las clases de Tailwind preconfiguradas:

```tsx
import { DESIGN } from '@/styles/design-system';

export const MyComponent = () => (
  <div className={DESIGN.layout.container}>
    <h1 className={DESIGN.text.h1}>Mi Título</h1>
    <button className={DESIGN.button.primary}>
      Continuar
    </button>
  </div>
);
```

### 3. Implementación de Componentes UI

Los componentes se encuentran en `src/app/components/ui/`. Son atómicos y reutilizables:

```tsx
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";

export default function Page() {
  return (
    <Card className="p-6">
      <Button variant="default">Click aquí</Button>
    </Card>
  );
}
```

---

## 🎨 Sincronización con Figma

Este proyecto sigue una metodología de **Tokens First**. Cualquier cambio en los valores de color o tipografía en Figma debe verse reflejado en `src/styles/theme.css` para mantener la paridad entre diseño y código.

---
Desarrollado con ❤️ para el equipo de Photo Album Creator.
