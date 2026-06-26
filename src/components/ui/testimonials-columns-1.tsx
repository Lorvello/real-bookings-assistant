"use client";
import React from "react";
import { motion } from "motion/react";

// HONEST pre-launch social proof. The product has not launched and has no customers
// yet, so there are NO testimonials here on purpose: fabricated quotes + stock-photo
// people (the previous content) are deceptive social proof and an FTC/AVG/DSA exposure.
// Instead this section shows honest, verifiable USE CASES — what the assistant does for
// each kind of appointment business — with no invented names, photos, quotes or stats.
// When real customers exist, swap these for genuine, attributable testimonials.
const useCases = [
  { sector: "Hair & beauty salons", text: "Clients book, move and cancel their appointment straight from WhatsApp. No app to install, no phone tag." },
  { sector: "Medical & dental practices", text: "Patients request a time in a chat. The assistant checks your real availability and confirms it." },
  { sector: "Fitness & yoga studios", text: "Members book a class by message. A cancellation frees the spot automatically." },
  { sector: "Consultants & coaches", text: "Prospects book a call without the email back-and-forth. Automatic reminders reduce no-shows." },
  { sector: "Nail & beauty bars", text: "The assistant knows your hours and services, so a quick question turns into a booked slot." },
  { sector: "Restaurants & tasting rooms", text: "Guests reserve over WhatsApp and get an instant confirmation, day or night." },
  { sector: "Pet grooming", text: "Owners book grooming in a chat and get a reminder the day before the visit." },
  { sector: "Massage & wellness", text: "Clients book and reschedule their own treatments, around the clock." },
  { sector: "Independent professionals", text: "One WhatsApp line quietly runs your whole calendar while you work." },
];

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: typeof useCases;
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-4 md:gap-6 pb-4 md:pb-6"
      >
        {new Array(2).fill(0).map((_, index) => (
          <React.Fragment key={`usecase-group-${index}`}>
            {props.testimonials.map(({ text, sector }, i) => (
              <div className="p-3 md:p-10 rounded-2xl md:rounded-3xl border shadow-lg shadow-primary/10 max-w-[280px] md:max-w-xs w-full" key={`${index}-${i}`}>
                <div className="text-xs md:text-lg leading-tight md:leading-normal font-garamond font-light">{text}</div>
                <div className="flex items-center gap-2 mt-3 md:mt-5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400/80 shrink-0" aria-hidden="true" />
                  <div className="font-medium tracking-tight leading-tight text-[10px] md:text-base md:leading-5">{sector}</div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
};

const firstColumn = useCases.slice(0, 3);
const secondColumn = useCases.slice(3, 6);
const thirdColumn = useCases.slice(6, 9);

const Testimonials = () => {
  return (
    <section className="py-8 md:py-20 pt-32 md:pt-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20"></div>

      <div className="max-w-6xl mx-auto relative z-10 px-4 md:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="text-center mb-6 md:mb-16"
        >
          <div className="inline-flex items-center bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5 md:px-6 md:py-3 mb-4 md:mb-8">
            <span className="text-emerald-400 font-garamond font-light text-sm md:text-lg">Who it's for</span>
          </div>

          <h2 className="text-3xl md:text-5xl xl:text-6xl font-medium text-white mb-3 md:mb-6 px-3 sm:px-0">
            Built for every <span className="text-emerald-400 biolum-text-subtle">appointment business</span>
          </h2>
          <p className="text-base md:text-xl text-slate-400 max-w-3xl mx-auto px-3 sm:px-0 font-garamond font-light">
            From salons to clinics to studios: if you book appointments, the WhatsApp assistant fits right in.
          </p>
        </motion.div>

        <div className="flex justify-center gap-4 md:gap-6 mt-6 md:mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[500px] md:max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
