
const HowItWorks = () => {
  return (
    <section className="py-section px-6 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works <span className="text-primary">(3 Simple Steps)</span>
          </h2>
          <p className="text-lg text-muted-foreground">From first contact to confirmed booking - all automated</p>
        </div>
        
        <div className="grid-responsive-3">
          <div className="text-center">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-lg">💬</span>
            </div>
            <div className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-3 w-fit mx-auto">
              STEP 1
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Client Sends Message</h3>
            <p className="text-muted-foreground text-sm">
              Your potential client messages your WhatsApp number asking about availability or services
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-lg">🤖</span>
            </div>
            <div className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-3 w-fit mx-auto">
              STEP 2
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">AI Asks Smart Questions</h3>
            <p className="text-muted-foreground text-sm">
              The AI agent qualifies the lead, gathers requirements, and checks your real-time availability
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-lg">✅</span>
            </div>
            <div className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-3 w-fit mx-auto">
              STEP 3
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Booking Confirmed</h3>
            <p className="text-muted-foreground text-sm">
              AI books the appointment, syncs with your calendar, and sends confirmation to both parties
            </p>
          </div>
        </div>
        
        <div className="mt-16 card-default text-center">
          <h3 className="text-xl font-semibold text-foreground mb-3">Average Booking Time: Under 3 Minutes</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            While your competitors make customers wait hours for a response, your AI books them instantly
          </p>
          <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl inline-block">
            <p className="text-primary font-semibold text-sm">⚡ Result: 300% faster booking process</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
