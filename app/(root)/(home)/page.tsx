"use client"
import MeetingTypeList from '@/components/MeetingTypeList';
import React from 'react'
import { useState, useEffect } from 'react'; // Import useState and useEffect

const Home = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date()); // Update the time every second
}, 1000);

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  const months = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
  ];

  const days = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday"
  ];

  const month = time.getMonth();
  const year = time.getFullYear();
  const weekDay = time.getDay();
  const day = time.getDate(); // Use getDate() to get the day of the month

  // Format time in 24-hour format
  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const formattedTime = `${hours}:${minutes}`;
  return (
    <section className='flex size-full flex-col gap-10 text-white'>
      <div className='h-[300px] w-full rounded-[20px] bg-hero bg-cover'>
        <div className='flex h-full flex-col justify-between max-md:px-5 max-md:py-8 lg:p-11'>
          <h2 className='glassmorphism max-w-[270px] rounded py-2 text-center text-base font-normal'>
            Upcoming Meetings
          </h2>
          <div className='flex flex-col gap-2'>
            <h1 className='text-4xl font-extrabold lg:text-7xl'>{formattedTime}</h1>
            <p className='text-lg font-medium text-sky-1 lg:text-2xl'>{days[weekDay]}, {months[month]} {day}, {year}</p>
          </div>
        </div>
      </div>

      <MeetingTypeList />
    </section>
  )
}

export default Home