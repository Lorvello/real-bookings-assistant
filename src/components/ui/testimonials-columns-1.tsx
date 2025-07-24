
"use client";
import React from "react";
import { motion } from "motion/react";
import { useTranslation } from '@/hooks/useTranslation';

// Get testimonials from translations based on language
const getTestimonials = (t: (key: string) => any) => {
  const testimonials = t('testimonials.testimonials');
  return Array.isArray(testimonials) ? testimonials : [];
};

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: any[];
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
        className="flex flex-col gap-4 md:gap-6 pb-4 md:pb-6 bg-background"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={`testimonial-group-${index}`}>
              {props.testimonials.map((testimonial, i) => (
                <div className="p-3 md:p-10 rounded-2xl md:rounded-3xl border shadow-lg shadow-primary/10 max-w-[280px] md:max-w-xs w-full" key={`${index}-${i}`}>
                  <div className="text-[10px] md:text-base leading-tight md:leading-normal">{testimonial.text}</div>
                  <div className="flex items-center gap-2 mt-3 md:mt-5">
                    <img
                      width={32}
                      height={32}
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="h-8 w-8 md:h-10 md:w-10 rounded-full"
                    />
                    <div className="flex flex-col">
                      <div className="font-medium tracking-tight leading-tight text-[10px] md:text-base md:leading-5">{testimonial.name}</div>
                      <div className="leading-tight md:leading-5 opacity-60 tracking-tight text-[9px] md:text-base">{testimonial.role}</div>
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

const Testimonials = () => {
  const { t } = useTranslation();
  const testimonials = getTestimonials(t);
  
  const firstColumn = testimonials.slice(0, 3);
  const secondColumn = testimonials.slice(3, 6);
  const thirdColumn = testimonials.slice(6, 9);
  
  return (
    <section className="py-8 md:py-20 relative overflow-hidden">
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
            <span className="text-emerald-400 font-semibold text-xs md:text-base">{t('testimonials.badge')}</span>
          </div>

          <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-white mb-3 md:mb-6 px-3 sm:px-0">
            {t('testimonials.title')} <span className="text-emerald-400">{t('testimonials.titleAccent')}</span>
          </h2>
          <p className="text-xs md:text-lg text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
            {t('testimonials.subtitle')}
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
