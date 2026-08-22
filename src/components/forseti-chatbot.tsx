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
    };
  }
}

type ForsetiChatbotProps = {
  authenticated: boolean;
  userName?: string;
};

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
  const placeholder = process.env.NEXT_PUBLIC_CHATBOT_PLACEHOLDER ?? "Escribe tu consulta";
  const welcomeMessage =
    process.env.NEXT_PUBLIC_CHATBOT_WELCOME_MESSAGE ?? "Hola, soy Forseti. ¿Qué necesitas revisar hoy?";
  const tone = process.env.NEXT_PUBLIC_CHATBOT_TONE ?? "clear";
  const objective = process.env.NEXT_PUBLIC_CHATBOT_OBJECTIVE ?? "support";
  const primaryColor = process.env.NEXT_PUBLIC_CHATBOT_PRIMARY_COLOR ?? "#42c7ed";
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

  useEffect(() => {
    const config = {
      tenant,
      installation,
      channel: "next",
      hostApp,
      appName,
      launcherLabel,
      placeholder,
      welcomeMessage,
      tone,
      objective,
      primaryColor,
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
    position,
    primaryColor,
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

  return <Script src={`${widgetBaseUrl}/chatbot/widget.js`} strategy="afterInteractive" />;
}
