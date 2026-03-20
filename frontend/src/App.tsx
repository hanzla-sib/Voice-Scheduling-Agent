import { Toaster } from "@/components/ui/sonner";
import { VoiceAgent } from "./components/VoiceAgent";

function App() {
  return (
    <>
      <VoiceAgent />
      <Toaster position="top-center" theme="dark" richColors />
    </>
  );
}

export default App;
