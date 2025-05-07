import { useWebSocket } from "@/context/WebSocketContext";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

interface TypingIndicatorProps {
  chainId: number;
  className?: string;
}

const TypingIndicator = ({ chainId, className = "" }: TypingIndicatorProps) => {
  const { typingUsers, onlineUsers } = useWebSocket();
  const { user } = useAuth();
  const [typingNames, setTypingNames] = useState<string[]>([]);

  // Update typing names when typingUsers changes
  useEffect(() => {
    if (!chainId || !user) return;
    
    const typingUserIds = typingUsers.get(chainId) || [];
    
    // Filter out current user and get names
    const names = typingUserIds
      .filter(id => id !== user.id)
      .map(id => {
        const userInfo = onlineUsers.get(id);
        return userInfo ? (userInfo.displayName || userInfo.username) : "Alguém";
      });
    
    setTypingNames(names);
  }, [typingUsers, chainId, onlineUsers, user]);

  // No typing users
  if (typingNames.length === 0) {
    return null;
  }

  // Get display text based on number of typing users
  let displayText = "";
  if (typingNames.length === 1) {
    displayText = `${typingNames[0]} está digitando...`;
  } else if (typingNames.length === 2) {
    displayText = `${typingNames[0]} e ${typingNames[1]} estão digitando...`;
  } else {
    displayText = `${typingNames[0]} e ${typingNames.length - 1} outros estão digitando...`;
  }

  return (
    <AnimatePresence>
      <motion.div 
        className={`text-xs text-gray-500 italic ${className}`}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center">
          <span className="mr-1">{displayText}</span>
          <span className="flex">
            <span className="typing-dot w-1 h-1 bg-primary-500 rounded-full animate-ping mx-0.5"></span>
            <span className="typing-dot w-1 h-1 bg-primary-500 rounded-full animate-ping mx-0.5 animation-delay-200"></span>
            <span className="typing-dot w-1 h-1 bg-primary-500 rounded-full animate-ping mx-0.5 animation-delay-400"></span>
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TypingIndicator;