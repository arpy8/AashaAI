import { Button } from "@/components/ui/button";

export const Sidebar = ({
  handleNewSession,
  sessions,
  setSelectedSessionId,
  selectedSessionId,
  setShowApiKeyInput,
  className = "",
}: {
  handleNewSession: () => void;
  sessions: { id: string; created: number }[];
  setSelectedSessionId: (id: string) => void;
  selectedSessionId: string | null;
  setShowApiKeyInput: (show: boolean) => void;
  className?: string;
}) => {
  return (
    <div className={className}>
      <div className="mt-10 w-64 bg-card border border-gray-800 rounded-lg rounded-xl mr-8 flex-shrink-0 h-[620px] px-2 flex flex-col justify-between">
        <div className="p-4 flex flex-col justify-between items-center">
          <span className="font-semibold text-lg text-foreground">Chats</span>
          <Button
            variant="default"
            className="border border rounded-[5px] mt-2 cursor-pointer w-[28.5vh]"
            onClick={handleNewSession}
          >
            + New
          </Button>
        </div>
        <ul className="flex-1 px-2">
          {sessions.map((session) => (
            <li key={session.id}>
              <button
                className={`w-full text-left px-4 py-2 cursor-pointer hover:bg-muted rounded-[5px] mb-1 text-xs ${session.id === selectedSessionId
                  ? "bg-foreground/15 font-bold"
                  : ""
                  }`}
                onClick={() => setSelectedSessionId(session.id)}
              >
                {new Date(session.created).toLocaleString()}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};