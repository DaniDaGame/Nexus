// components/VideoStreamArea.tsx (גרסה סופר-מפושטת לניסוי)
'use client';

import React from 'react';
import {
  PaginatedGridLayout,
  SpeakerLayout,
} from '@stream-io/video-react-sdk';

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

interface VideoStreamAreaProps {
  layout: CallLayoutType;
}

const VideoStreamArea: React.FC<VideoStreamAreaProps> = ({ layout }) => {
  switch (layout) {
      case 'speaker-left':
           return <SpeakerLayout participantsBarPosition="left"/>;
      case 'speaker-right':
           return <SpeakerLayout participantsBarPosition="right"/>;
      case 'grid':
      default:
          // הסרנו את כל ה-div העוטפים, רק הקומפוננטה של Stream
          return <PaginatedGridLayout />;
  }
};

export default VideoStreamArea;