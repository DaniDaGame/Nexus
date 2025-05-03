import React from "react";
import {
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  RecordCallButton,
  CallStatsButton,
  useCall,
} from "@stream-io/video-react-sdk";
import { PhoneOff } from "lucide-react";

const LeaveButton = () => {
  const call = useCall();

  const handleLeave = async () => {
    if (call) {
      await call.leave();
      console.log("Call left");
    }
  };

  return (
    <button
      onClick={handleLeave}
      className="bg-red-600 hover:bg-red-700 p-3 rounded-full text-white"
    >
      <PhoneOff className="w-4 h-4"/>
    </button>
  );
};

type CustomCallControlsProps = {
  onLeave: () => void;
};

const CustomCallControls: React.FC<CustomCallControlsProps> = ({ onLeave }) => {
  return (
    <div className="flex items-center gap-3 px-6 py-3">
      <button className="rounded-full">
        <RecordCallButton caption="" />
      </button>
      <button className="rounded-full">
        <ToggleAudioPublishingButton caption="" />
      </button>
      <button className="rounded-full">
        <ToggleVideoPublishingButton caption="" />
      </button>
      <button onClick={onLeave}>
        <LeaveButton />
      </button>
    </div>
  );
};


export default CustomCallControls;