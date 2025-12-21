import { motion, type Variants } from "framer-motion" // <--- Add type Variants
import { useNavigate } from "react-router-dom"
import { 
  FileQuestion, 
  Home, 
  MoveLeft, 
  SearchX, 
  GraduationCap, 
  BookOpen, 
  Calculator 
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  const navigate = useNavigate()

  // --- FIX: Explicitly type the return as Variants ---
  const float = (delay: number): Variants => ({
    initial: { y: 0, rotate: 0, opacity: 0 },
    animate: {
      y: [0, -20, 0],
      rotate: [0, 5, -5, 0],
      opacity: [0.3, 0.6, 0.3],
      transition: {
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay,
      },
    },
  })

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background flex items-center justify-center font-sans selection:bg-primary/20">
      
      {/* --- Background Decorative Elements --- */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Left - Grades */}
        <motion.div 
          variants={float(0)} 
          initial="initial" 
          animate="animate" 
          className="absolute top-[10%] left-[10%] text-primary/10"
        >
          <span className="text-9xl font-bold font-serif">A+</span>
        </motion.div>

        {/* Bottom Right - Shapes */}
        <motion.div 
          variants={float(2)} 
          initial="initial" 
          animate="animate" 
          className="absolute bottom-[15%] right-[10%] text-primary/10"
        >
          <GraduationCap size={180} strokeWidth={1} />
        </motion.div>

        {/* Random Floating Icons */}
        <motion.div variants={float(1)} initial="initial" animate="animate" className="absolute top-[20%] right-[20%] text-muted/20">
          <BookOpen size={64} />
        </motion.div>
        <motion.div variants={float(3)} initial="initial" animate="animate" className="absolute bottom-[20%] left-[15%] text-muted/20">
          <Calculator size={64} />
        </motion.div>
      </div>

      {/* --- Main Content Card --- */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 mx-4 max-w-md w-full text-center"
      >
        {/* Glassmorphism Container */}
        <div className="rounded-3xl border border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-xl shadow-2xl p-8 md:p-12">
          
          {/* Animated 404 Graphic */}
          <div className="flex justify-center mb-8 relative">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
               {/* The "0" in 404 is a missing file icon */}
              <div className="flex items-center gap-2 text-primary font-black text-8xl tracking-tighter">
                <span>4</span>
                <div className="relative">
                  <FileQuestion className="w-24 h-24 text-muted-foreground/50" strokeWidth={1.5} />
                  <motion.div 
                    className="absolute -bottom-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    <SearchX size={20} />
                  </motion.div>
                </div>
                <span>4</span>
              </div>
            </motion.div>
          </div>

          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Assessment Not Found
            </h1>
            <p className="text-muted-foreground mb-8 text-sm md:text-base leading-relaxed">
              It looks like this page failed to show up for class. 
              We've checked the library, the archives, and the faculty lounge, 
              but it's nowhere to be found.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate(-1)}
              className="group"
            >
              <MoveLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Go Back
            </Button>
            
            <Button 
              size="lg" 
              onClick={() => navigate("/dashboard")}
              className="shadow-lg shadow-primary/20"
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </motion.div>
        </div>

        {/* Footer Code */}
        <div className="mt-8 text-xs text-muted-foreground font-mono opacity-50">
          ERROR_CODE: STUDENT_LOST_IN_SPACE
        </div>

      </motion.div>
    </div>
  )
}