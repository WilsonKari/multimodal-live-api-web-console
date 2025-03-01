/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import cn from "classnames";
import { useEffect, useRef, useState } from "react";
import { RiSidebarFoldLine, RiSidebarUnfoldLine } from "react-icons/ri";
import Select from "react-select";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useLoggerStore } from "../../lib/store-logger";
import Logger, { LoggerFilterType } from "../logger/Logger";
import "./side-panel.scss";
import eventBus from "../../lib/events/eventBus";

const filterOptions = [
  { value: "conversations", label: "Conversations" },
  { value: "tools", label: "Tool Use" },
  { value: "none", label: "All" },
];

export default function SidePanel() {
  const { connected, client } = useLiveAPIContext();
  const [open, setOpen] = useState(true);
  const loggerRef = useRef<HTMLDivElement>(null);
  const loggerLastHeightRef = useRef<number>(-1);
  const { log, logs } = useLoggerStore();
  const [pendingMessages, setPendingMessages] = useState<string[]>([]);
  const [textInput, setTextInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  //scroll the log to the bottom when new logs come in
  useEffect(() => {
    if (loggerRef.current) {
      const el = loggerRef.current;
      const scrollHeight = el.scrollHeight;
      if (scrollHeight !== loggerLastHeightRef.current) {
        el.scrollTop = scrollHeight;
        loggerLastHeightRef.current = scrollHeight;
      }
    }
  }, [logs]);

  // listen for log events and store them
  useEffect(() => {
    client.on("log", log);
    return () => {
      client.off("log", log);
    };
  }, [client, log]);

  // Escuchar mensajes aprobados
  useEffect(() => {
    const handleApprovedMessage = (message: string) => {
      // Si es un mensaje de Spotify, procesarlo directamente sin verificaciones adicionales
      if (message.startsWith('[Spotify]')) {
        console.log('[LOG-SPOTIFY] Mensaje entrando al cuadro de texto:', {
          message,
          connected,
          queueLength: pendingMessages.length,
          timestamp: new Date().toISOString()
        });

        if (connected) {
          // Verificar si ya existe el mismo mensaje en la cola
          if (pendingMessages.includes(message)) {
            console.log('[LOG-SPOTIFY] Mensaje duplicado en cola, ignorando');
            return;
          }

          setTextInput(message);
          const timeoutId = setTimeout(() => {
            if (connected && message.trim()) {
              try {
                client.send([{ text: message }]);
                setTextInput("");
              } catch (error) {
                console.error('[LOG-SPOTIFY] Error al enviar mensaje:', error);
                setPendingMessages(prev => [...prev, message]);
              }
            }
          }, 1000);
          return () => clearTimeout(timeoutId);
        } else {
          setPendingMessages(prev => [...prev, message]);
        }
        return;
      }

      // Para mensajes que no son de Spotify (son de TikTok), verificar de forma muy estricta
      console.log('[LOG-9] Mensaje a punto de ser procesado:', {
        message,
        eventEnabled: eventBus.isEventEnabled('tiktokChatMessage'),
        connected,
        timestamp: new Date().toISOString()
      });

      // Verificación estricta: si el evento TikTok está deshabilitado, no procesar el mensaje
      if (!eventBus.isEventEnabled('tiktokChatMessage')) {
        console.log('[LOG-SIDEPANEL] Bloqueando mensaje de TikTok porque el evento está deshabilitado:', {
          message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (connected) {
        setTextInput(message);
        
        const timeoutId = setTimeout(() => {
          // Verificar nuevamente antes de enviar, por si cambió el estado
          if (!eventBus.isEventEnabled('tiktokChatMessage')) {
            console.log('[LOG-SIDEPANEL] Bloqueando envío de mensaje de TikTok porque el evento se deshabilitó durante el timeout:', {
              message,
              timestamp: new Date().toISOString()
            });
            setTextInput("");
            return;
          }

          if (connected && message.trim()) {
            try {
              client.send([{ text: message }]);
              setTextInput("");
            } catch (error) {
              setPendingMessages(prev => [...prev, message]);
            }
          } else {
            setPendingMessages(prev => [...prev, message]);
          }
        }, 1000);

        return () => clearTimeout(timeoutId);
      } else {
        // Verificar si debemos agregar mensajes a la cola cuando no estamos conectados
        if (eventBus.isEventEnabled('tiktokChatMessage')) {
          setPendingMessages(prev => [...prev, message]);
        } else {
          console.log('[LOG-SIDEPANEL] No añadiendo mensaje a la cola porque el evento está deshabilitado:', {
            message,
            timestamp: new Date().toISOString()
          });
        }
      }
    };

    eventBus.on('approvedChatMessage', handleApprovedMessage);
    
    return () => {
      eventBus.off('approvedChatMessage', handleApprovedMessage);
    };
  }, [connected, client, pendingMessages]);

  // Procesar mensajes pendientes cuando el asistente se conecta
  useEffect(() => {
    if (connected && pendingMessages.length > 0) {
      const processNextMessage = () => {
        const message = pendingMessages[0];
        autoSubmitMessage(message);
        setPendingMessages(prev => prev.slice(1));
      };

      const intervalId = setInterval(() => {
        if (pendingMessages.length > 0) {
          processNextMessage();
        } else {
          clearInterval(intervalId);
        }
      }, 1500);

      return () => clearInterval(intervalId);
    }
  }, [connected, pendingMessages]);

  const handleSubmit = () => {
    if (!textInput.trim() || !connected) return;
    
    try {
      client.send([{ text: textInput }]);
      setTextInput("");
      if (inputRef.current) {
        inputRef.current.innerText = "";
      }
    } catch (error) {
      setPendingMessages(prev => [...prev, textInput]);
    }
  };

  const autoSubmitMessage = (message: string) => {
    if (!connected) {
      setPendingMessages(prev => [...prev, message]);
      return;
    }

    setTextInput(message);
    
    const timeoutId = setTimeout(() => {
      if (connected && message.trim()) {
        try {
          client.send([{ text: message }]);
          setTextInput("");
        } catch (error) {
          setPendingMessages(prev => [...prev, message]);
        }
      } else {
        setPendingMessages(prev => [...prev, message]);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  };

  return (
    <div className={`side-panel ${open ? "open" : ""}`}>
      <header className="top">
        <h2>Console</h2>
        {open ? (
          <button className="opener" onClick={() => setOpen(false)}>
            <RiSidebarFoldLine color="#b4b8bb" />
          </button>
        ) : (
          <button className="opener" onClick={() => setOpen(true)}>
            <RiSidebarUnfoldLine color="#b4b8bb" />
          </button>
        )}
      </header>
      <section className="indicators">
        <Select
          className="react-select"
          classNamePrefix="react-select"
          styles={{
            control: (baseStyles) => ({
              ...baseStyles,
              background: "var(--Neutral-15)",
              color: "var(--Neutral-90)",
              minHeight: "33px",
              maxHeight: "33px",
              border: 0,
            }),
            option: (styles, { isFocused, isSelected }) => ({
              ...styles,
              backgroundColor: isFocused
                ? "var(--Neutral-30)"
                : isSelected
                  ? "var(--Neutral-20)"
                  : undefined,
            }),
          }}
          defaultValue={selectedOption}
          options={filterOptions}
          onChange={(e) => {
            setSelectedOption(e);
          }}
        />
        <div className={cn("streaming-indicator", { connected })}>
          {connected
            ? `🔵${open ? " Streaming" : ""}`
            : `⏸️${open ? " Paused" : ""}`}
        </div>
      </section>
      <div className="side-panel-container" ref={loggerRef}>
        <Logger
          filter={(selectedOption?.value as LoggerFilterType) || "none"}
        />
      </div>
      <div className={cn("input-container", { disabled: !connected })}>
        {pendingMessages.length > 0 && !connected && (
          <div className="pending-messages-indicator">
            {pendingMessages.length} mensajes pendientes
          </div>
        )}
        <div className="input-content">
          <textarea
            className="input-area"
            ref={inputRef}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit();
              }
            }}
            onChange={(e) => setTextInput(e.target.value)}
            value={textInput}
          ></textarea>
          <span
            className={cn("input-content-placeholder", {
              hidden: textInput.length,
            })}
          >
            Type&nbsp;something...
          </span>

          <button
            className="send-button material-symbols-outlined filled"
            onClick={handleSubmit}
          >
            send
          </button>
        </div>
      </div>
    </div>
  );
}
