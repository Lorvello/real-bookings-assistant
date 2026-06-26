"use client";

import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
}

interface PlaceholdersAndVanishInputProps {
  placeholders: string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

function PlaceholdersAndVanishInput({
  placeholders,
  onChange,
  onSubmit,
}: PlaceholdersAndVanishInputProps) {
  const { t } = useTranslation('home');
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const newDataRef = useRef<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [animating, setAnimating] = useState(false);

  const startAnimation = () => {
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState !== "visible" && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else if (document.visibilityState === "visible") {
      startAnimation();
    }
  };

  useEffect(() => {
    startAnimation();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [placeholders]);

  const draw = useCallback(() => {
    if (!inputRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 800;
    ctx.clearRect(0, 0, 800, 800);
    const computedStyles = getComputedStyle(inputRef.current);

    const fontSize = parseFloat(computedStyles.getPropertyValue("font-size"));
    ctx.font = `${fontSize * 2}px ${computedStyles.fontFamily}`;
    ctx.fillStyle = "#FFF";
    ctx.fillText(value, 16, 40);

    const imageData = ctx.getImageData(0, 0, 800, 800);
    const pixelData = imageData.data;
    const newData: any[] = [];

    for (let t = 0; t < 800; t++) {
      let i = 4 * t * 800;
      for (let n = 0; n < 800; n++) {
        let e = i + 4 * n;
        if (
          pixelData[e] !== 0 &&
          pixelData[e + 1] !== 0 &&
          pixelData[e + 2] !== 0
        ) {
          newData.push({
            x: n,
            y: t,
            color: [
              pixelData[e],
              pixelData[e + 1],
              pixelData[e + 2],
              pixelData[e + 3],
            ],
          });
        }
      }
    }

    newDataRef.current = newData.map(({ x, y, color }) => ({
      x,
      y,
      r: 1,
      color: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`,
    }));
  }, [value]);

  useEffect(() => {
    draw();
  }, [value, draw]);

  const animate = (start: number) => {
    const animateFrame = (pos: number = 0) => {
      requestAnimationFrame(() => {
        const newArr = [];
        for (let i = 0; i < newDataRef.current.length; i++) {
          const current = newDataRef.current[i];
          if (current.x < pos) {
            newArr.push(current);
          } else {
            if (current.r <= 0) {
              current.r = 0;
              continue;
            }
            current.x += Math.random() > 0.5 ? 1 : -1;
            current.y += Math.random() > 0.5 ? 1 : -1;
            current.r -= 0.05 * Math.random();
            newArr.push(current);
          }
        }
        newDataRef.current = newArr;
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          ctx.clearRect(pos, 0, 800, 800);
          newDataRef.current.forEach((t) => {
            const { x: n, y: i, r: s, color: color } = t;
            if (n > pos) {
              ctx.beginPath();
              ctx.rect(n, i, s, s);
              ctx.fillStyle = color;
              ctx.strokeStyle = color;
              ctx.stroke();
            }
          });
        }
        if (newDataRef.current.length > 0) {
          animateFrame(pos - 8);
        } else {
          setValue("");
          setAnimating(false);
        }
      });
    };
    animateFrame(start);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !animating) {
      vanishAndSubmit();
    }
  };

  const vanishAndSubmit = () => {
    // Respect reduced-motion: skip the particle-dissolve effect, just clear the field.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue("");
      return;
    }

    setAnimating(true);
    draw();

    const value = inputRef.current?.value || "";
    if (value && inputRef.current) {
      const maxX = newDataRef.current.reduce(
        (prev, current) => (current.x > prev ? current.x : prev),
        0
      );
      animate(maxX);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    vanishAndSubmit();
    onSubmit && onSubmit(e);
  };

  return (
    <form
      className={cn(
        "w-full relative mx-auto bg-background rounded-2xl sm:rounded-full overflow-hidden shadow-xl border border-primary/20 transition duration-200",
        // Visible, on-brand focus indicator (the inner input clears its own ring): emerald bloom on the pill.
        "focus-within:border-primary/60 focus-within:shadow-[0_0_0_3px_rgba(26,127,77,0.25)]",
        "h-12 sm:h-14", // Smaller height on mobile
        value && "bg-background-secondary"
      )}
      onSubmit={handleSubmit}
    >
      <canvas
        className={cn(
          "absolute pointer-events-none text-base transform scale-50 top-[20%] left-2 sm:left-8 origin-top-left filter invert-0 pr-20",
          !animating ? "opacity-0" : "opacity-100"
        )}
        ref={canvasRef}
      />
      <input
        onChange={(e) => {
          if (!animating) {
            setValue(e.target.value);
            onChange && onChange(e);
          }
        }}
        onKeyDown={handleKeyDown}
        ref={inputRef}
        value={value}
        type="text"
        aria-label={t('demo.aiAgent.ariaType', 'Type your message')}
        className={cn(
          "w-full relative text-sm z-50 border-none text-foreground bg-transparent h-full rounded-2xl sm:rounded-full focus:outline-none focus:ring-0 pl-4 sm:pl-8 pr-16 sm:pr-20",
          animating && "text-transparent"
        )}
      />

      <button
        disabled={!value}
        type="submit"
        aria-label={t('demo.aiAgent.ariaSend', 'Send message')}
        className="absolute right-2 top-1/2 z-50 -translate-y-1/2 h-11 w-11 sm:h-10 sm:w-10 rounded-full disabled:bg-muted bg-primary hover:bg-whatsapp transition duration-200 flex items-center justify-center disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
      >
        <Send aria-hidden="true" className="text-white h-3 w-3 sm:h-4 sm:w-4" />
      </button>

      <div className="absolute inset-0 flex items-center rounded-2xl sm:rounded-full pointer-events-none">
        <AnimatePresence mode="wait">
          {!value && (
            <motion.p
              initial={{ y: 5, opacity: 0 }}
              key={`current-placeholder-${currentPlaceholder}`}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              transition={{ duration: 0.3, ease: "linear" }}
              className="text-muted-foreground text-xs sm:text-base font-normal pl-4 sm:pl-8 text-left w-[calc(100%-3rem)] sm:w-[calc(100%-5rem)] truncate"
            >
              {placeholders[currentPlaceholder]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}

export default function AIAgentTestPage({
  framed = true,
  // Copy is context-specific: when no prop is passed (public marketing demo) the strings are the
  // translated marketing defaults; the logged-in Test-AI-Agent page passes its own owner-facing
  // strings ("Your AI Agent", etc.), which override the defaults and are translated in Blok D-app.
  title,
  greeting,
  hint,
}: { framed?: boolean; title?: string; greeting?: string; hint?: string } = {}) {
  const { t } = useTranslation('home');
  const resolvedTitle = title ?? t('demo.aiAgent.title', 'AI Agent Demo');
  const resolvedGreeting = greeting ?? t('demo.aiAgent.greeting', "Hello! I'm your AI agent. Ask me a question to test my capabilities!");
  const resolvedHint = hint ?? t('demo.aiAgent.hint', 'Press Enter to send your message • Powered by AI');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content: resolvedGreeting,
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const placeholders = [
    t('demo.aiAgent.placeholder1', "Ask me something about your business..."),
    t('demo.aiAgent.placeholder2', "Test my knowledge about marketing..."),
    t('demo.aiAgent.placeholder3', "Ask me about WhatsApp automation..."),
    t('demo.aiAgent.placeholder4', "Ask me for a lead generation strategy..."),
    t('demo.aiAgent.placeholder5', "Test my creativity with content ideas..."),
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const getAIResponse = async (userMessage: string, history: Message[]): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('test-ai-agent', {
      body: {
        message: userMessage,
        conversation_history: history.map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      },
    });

    if (error) {
      console.error('AI agent error:', error);
      throw error;
    }

    return data.reply || t('demo.aiAgent.errorNoResponse', "Sorry, I couldn't generate a response.");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsTyping(true);

    try {
      const reply = await getAIResponse(inputValue, updatedMessages);
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: t('demo.aiAgent.errorGeneric', "Sorry, something went wrong. Please try again."),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="h-full bg-gradient-to-br from-background via-card to-background text-foreground flex flex-col">
      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full flex flex-col"
        >
          {/* Chat Container - Smaller on mobile.
              framed (default, public marketing surfaces): the chat carries its own card (border + shadow).
              framed={false} (the logged-in Test AI Agent page): fill the parent's surface-raised frame
              seamlessly so there is ONE card, not a double-ring. */}
          <div className={cn(
            "overflow-hidden flex flex-col h-full",
            framed && "bg-background/50 backdrop-blur-sm border border-primary/20 rounded-lg sm:rounded-2xl shadow-2xl"
          )}>
            {/* Chat Header - More compact on mobile */}
            <div className="bg-gradient-to-r from-background to-background-secondary px-3 sm:px-6 py-3 sm:py-4 border-b border-primary/20">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary rounded-full">
                  <Bot aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">{resolvedTitle}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{t('demo.aiAgent.online', 'Online and ready to help')}</p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-whatsapp rounded-full animate-pulse motion-reduce:animate-none"></div>
                  <span className="text-xs text-muted-foreground">{t('demo.aiAgent.live', 'Live')}</span>
                </div>
              </div>
            </div>

            {/* Messages - More compact on mobile */}
            <div role="log" aria-live="polite" aria-label={t('demo.aiAgent.ariaLog', 'Conversation messages')} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-gradient-to-b from-background-secondary/30 to-background/30 min-h-0">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "flex gap-2 sm:gap-3",
                      message.type === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.type === "bot" && (
                      <div className="p-1.5 sm:p-2 bg-primary rounded-full h-fit shrink-0">
                        <Bot aria-hidden="true" className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl",
                        message.type === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card text-foreground border border-primary/20 rounded-bl-md"
                      )}
                    >
                      <p className="text-xs sm:text-sm leading-relaxed">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {message.type === "user" && (
                      <div className="p-1.5 sm:p-2 bg-whatsapp rounded-full h-fit shrink-0">
                        <User aria-hidden="true" className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2 sm:gap-3 justify-start"
                >
                  <div className="p-1.5 sm:p-2 bg-primary rounded-full h-fit shrink-0">
                    <Bot aria-hidden="true" className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <div className="bg-card border border-primary/20 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce motion-reduce:animate-none"></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input - More compact on mobile */}
            <div className="p-2 sm:p-3 bg-gradient-to-r from-card to-background border-t border-primary/20">
              <PlaceholdersAndVanishInput
                placeholders={placeholders}
                onChange={handleInputChange}
                onSubmit={handleSubmit}
              />
              <p className="text-xs text-muted-foreground mt-1 sm:mt-2 text-center">
                {resolvedHint}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
    </MotionConfig>
  );
}
