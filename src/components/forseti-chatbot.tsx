"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    MLCChatbotConfig?: Record<string, unknown>;
    MLCChatbotWidget?: {
      mount: () => void;
      unmount: () => void;
      update: (config: Record<string, unknown>) => void;
      open?: () => void;
      close?: () => void;
      getConfig?: () => Record<string, unknown>;
    };
  }
}

type ForsetiChatbotProps = {
  authenticated: boolean;
  userName?: string;
};

const FORSETI_QUICK_ACTIONS = [
  { label: "Facturas", message: "Ayúdame con las facturas." },
  { label: "Gastos", message: "Quiero poner en orden los gastos." },
  { label: "Presupuestos", message: "Necesito preparar un presupuesto." },
  { label: "Estado del negocio", message: "Dame una visión rápida del negocio." },
];

function normalizePath(path: string) {
  if (!path) return "/";
  const normalized = `/${path.replace(/^\/+/, "")}`.replace(/\/+$/, "");
  return normalized === "" ? "/" : normalized;
}

function matchesPath(currentPath: string, rules: string[]) {
  return rules.some((rule) => {
    const normalizedRule = normalizePath(rule);
    if (normalizedRule === "/") return currentPath === "/";
    return currentPath === normalizedRule || currentPath.startsWith(`${normalizedRule}/`);
  });
}

function parsePathList(value: string | undefined, fallback: string[]) {
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizePath(item));
}

export function ForsetiChatbot({ authenticated, userName }: ForsetiChatbotProps) {
  const pathname = usePathname() || "/";
  const widgetBaseUrl = process.env.NEXT_PUBLIC_CHATBOT_WIDGET_BASE_URL ?? "";
  const tenant = process.env.NEXT_PUBLIC_CHATBOT_TENANT ?? "forseti";
  const installation = process.env.NEXT_PUBLIC_CHATBOT_INSTALLATION ?? "forseti-main";
  const hostApp = process.env.NEXT_PUBLIC_CHATBOT_HOST_APP ?? "forseti-web";
  const appName = process.env.NEXT_PUBLIC_CHATBOT_APP_NAME ?? "Forseti";
  const launcherLabel = process.env.NEXT_PUBLIC_CHATBOT_LAUNCHER_LABEL ?? "Hablar con Forseti";
  const placeholder = process.env.NEXT_PUBLIC_CHATBOT_PLACEHOLDER ?? "Habla con Forseti...";
  const promptLabel = process.env.NEXT_PUBLIC_CHATBOT_PROMPT_LABEL ?? "¿Qué necesitas gestionar?";
  const welcomeMessage =
    process.env.NEXT_PUBLIC_CHATBOT_WELCOME_MESSAGE ??
    "Soy Forseti. Mantengo en orden la administración de tu negocio. Pregúntame por tus cuentas, facturas, gastos, cobros o documentos, o envíame uno para que lo procese.";
  const tone = process.env.NEXT_PUBLIC_CHATBOT_TONE ?? "clear";
  const objective = process.env.NEXT_PUBLIC_CHATBOT_OBJECTIVE ?? "support";
  const primaryColor = process.env.NEXT_PUBLIC_CHATBOT_PRIMARY_COLOR ?? "#87ba2f";
  const avatarUrl = process.env.NEXT_PUBLIC_CHATBOT_AVATAR_URL ?? "/logo-forseti.png";
  const position = process.env.NEXT_PUBLIC_CHATBOT_POSITION === "left" ? "left" : "right";
  const includePaths = parsePathList(
    process.env.NEXT_PUBLIC_CHATBOT_INCLUDE_PATHS,
    ["/", "/facturacion", "/presupuestos", "/forseti"],
  );
  const excludePaths = parsePathList(process.env.NEXT_PUBLIC_CHATBOT_EXCLUDE_PATHS, ["/login"]);

  const normalizedPath = normalizePath(pathname);
  const allowedByInclude = includePaths.length === 0 || matchesPath(normalizedPath, includePaths);
  const blockedByExclude = excludePaths.length > 0 && matchesPath(normalizedPath, excludePaths);
  const hasRequiredConfig = Boolean(widgetBaseUrl && tenant && installation);
  const shouldMount = hasRequiredConfig && allowedByInclude && !blockedByExclude;
  const widgetVersion = "2026-08-22c";

  useEffect(() => {
    const config = {
      tenant,
      installation,
      channel: "next",
      hostApp,
      appName,
      launcherLabel,
      placeholder,
      promptLabel,
      welcomeMessage,
      quickActions: FORSETI_QUICK_ACTIONS,
      tone,
      objective,
      primaryColor,
      avatarUrl,
      position,
      apiBaseUrl: widgetBaseUrl,
      widgetBaseUrl,
      authContext: {
        authenticated,
        userName: userName ?? "",
        userRole: authenticated ? "authenticated" : "guest",
      },
      enabled: shouldMount,
    };

    window.MLCChatbotConfig = config;

    if (!shouldMount) {
      window.MLCChatbotWidget?.unmount();
      return;
    }

    window.MLCChatbotWidget?.update(config);
    window.MLCChatbotWidget?.mount();

    return () => {
      window.MLCChatbotWidget?.unmount();
    };
  }, [
    appName,
    authenticated,
    hostApp,
    installation,
    launcherLabel,
    objective,
    placeholder,
    promptLabel,
    position,
    primaryColor,
    avatarUrl,
    shouldMount,
    tenant,
    tone,
    userName,
    welcomeMessage,
    widgetBaseUrl,
  ]);

  if (!hasRequiredConfig) {
    return null;
  }

  return <Script src={`${widgetBaseUrl}/chatbot/widget.js?v=${encodeURIComponent(widgetVersion)}`} strategy="afterInteractive" />;
}
