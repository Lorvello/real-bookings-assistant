"use client";
import React from "react";
import { motion } from "motion/react";

const testimonials = [
  {
    text: "Since implementing the WhatsApp booking assistant, I save 3 hours daily! No more back-and-forth messages. My customers love the instant responses, and I've increased bookings by 40%.",
    image: "https://randomuser.me/api/portraits/women/1.jpg",
    name: "Maria Santos",
    role: "Salon Owner",
  },
  {
    text: "The AI perfectly handles all appointment requests, even complex scheduling. My patients are amazed by the instant responses. It's like having a perfect receptionist 24/7.",
    image: "https://randomuser.me/api/portraits/men/2.jpg",
    name: "Dr. Thomas Mueller",
    role: "Medical Practice",
  },
  {
    text: "My members can now book classes instantly via WhatsApp. The AI knows all our schedules and handles cancellations perfectly. Revenue increased 35% in just 2 months!",
    image: "https://randomuser.me/api/portraits/women/3.jpg",
    name: "Sophie Laurent",
    role: "Fitness Studio Owner",
  },
  {
    text: "No more missed calls or booking confusion. The WhatsApp assistant works 24/7, captures every opportunity, and my no-show rate dropped by 80%.",
    image: "https://randomuser.me/api/portraits/men/4.jpg",
    name: "James Wilson",
    role: "Dental Practice",
  },
  {
    text: "Clients love booking consultations instantly through WhatsApp. The AI handles complex scheduling across time zones. My booking efficiency increased by 60%.",
    image: "https://randomuser.me/api/portraits/women/5.jpg",
    name: "Emily Chen",
    role: "Business Consultant",
  },
  {
    text: "Restaurant reservations are now completely automated. Customers book instantly, get confirmations, and we reduced staff workload by 50% while improving customer experience.",
    image: "https://randomuser.me/api/portraits/men/6.jpg",
    name: "Carlos Rodriguez",
    role: "Restaurant Manager",
  },
  {
    text: "Pet owners book grooming appointments instantly via WhatsApp. The AI remembers pet preferences and vaccination schedules. Bookings increased 45% since implementation.",
    image: "https://randomuser.me/api/portraits/women/7.jpg",
    name: "Lisa Thompson",
    role: "Pet Grooming Salon",
  },
  {
    text: "Massage therapy bookings are now effortless. Clients appreciate the instant booking confirmation and automated reminders. My business grew 30% in 6 months.",
    image: "https://randomuser.me/api/portraits/women/8.jpg",
    name: "Rachel Green",
    role: "Massage Therapist",
  },
  {
    text: "Legal consultations book seamlessly through WhatsApp. The AI handles complex scheduling and client intake forms. My practice efficiency improved dramatically.",
    image: "https://randomuser.me/api/portraits/men/9.jpg",
    name: "Michael Brown",
    role: "Law Firm Partner",
  },
];

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: typeof testimonials;
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
        className="flex flex-col gap-6 pb-6 bg-background"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, image, name, role }, i) => (
                <div className="p-10 rounded-3xl border shadow-lg shadow-primary/10 max-w-xs w-full" key={i}>
                  <div>{text}</div>
                  <div className="flex items-center gap-2 mt-5">
                    <img
                      width={40}
                      height={40}
                      src={image}
                      alt={name}
                      className="h-10 w-10 rounded-full"
                    />
                    <div className="flex flex-col">
                      <div className="font-medium tracking-tight leading-5">{name}</div>
                      <div className="leading-5 opacity-60 tracking-tight">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.div>
    </div>
  );
};

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const Testimonials = () => {
  return (
    <section className="bg-background my-20 relative">
      <div className="container z-10 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
        >
          <div className="flex justify-center">
            <div className="border py-1 px-4 rounded-lg">Testimonials</div>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tighter mt-5">
            What our users say
          </h2>
          <p className="text-center mt-5 opacity-75">
            See what our customers have to say about us.
          </p>
        </motion.div>

        <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>
      </div>
    </section>
  );
};

export default Testimonials;