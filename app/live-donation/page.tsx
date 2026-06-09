// app/overlay/live-donations/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Donation = {
  id: string;
  donor_name: string;
  amount: number;
  message: string;
};

export default function LiveDonationsOverlay() {
  const [latestAlert, setLatestAlert] = useState<Donation | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('public:donations_live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'donations' },
        (payload) => {
          const newDonation = payload.new as Donation;
          
          setLatestAlert(newDonation);
          
          // Clear the massive popup after 6 seconds
          setTimeout(() => setLatestAlert(null), 6000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-transparent flex items-center justify-center overflow-hidden font-sans text-white">
      
      {latestAlert && (
        <div className="animate-bounce flex flex-col items-center bg-zinc-900/95 p-12 rounded-[2rem] border-4 border-green-400 shadow-[0_0_60px_rgba(74,222,128,0.4)] text-center">
          <h1 className="text-7xl font-black uppercase text-green-400 tracking-widest mb-6 drop-shadow-lg">
            New Donation!
          </h1>
          <p className="text-5xl mt-2 leading-relaxed">
            <span className="font-extrabold text-white">{latestAlert.donor_name}</span> tipped 
            <span className="text-green-300 font-black ml-4">${latestAlert.amount}</span>
          </p>
        </div>
      )}

    </div>
  );
}