
const HowItWorks = () => {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-6">
            How It Works <span className="text-primary">(3 Simple Steps)</span>
          </h2>
          <p className="text-xl text-muted-foreground">From first contact to confirmed booking - all automated</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">💬</span>
            </div>
            <div className="bg-primary/10 text-primary text-sm font-semibold px-3 py-1 rounded-full mb-4 w-fit mx-auto">
              STEP 1
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Client Sends Message</h3>
            <p className="text-muted-foreground">
              Your potential client messages your WhatsApp number asking about availability or services
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">🤖</span>
            </div>
            <div className="bg-primary/10 text-primary text-sm font-semibold px-3 py-1 rounded-full mb-4 w-fit mx-auto">
              STEP 2
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">AI Asks Smart Questions</h3>
            <p className="text-muted-foreground">
              The AI agent qualifies the lead, gathers requirements, and checks your real-time availability
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">✅</span>
            </div>
            <div className="bg-primary/10 text-primary text-sm font-semibold px-3 py-1 rounded-full mb-4 w-fit mx-auto">
              STEP 3
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Booking Confirmed</h3>
            <p className="text-muted-foreground">
              AI books the appointment, syncs with your calendar, and sends confirmation to both parties
            </p>
          </div>
        </div>
        
        <div className="mt-16 bg-card p-8 rounded-2xl shadow-sm border border-border">
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-card-foreground mb-4">Average Booking Time: Under 3 Minutes</h3>
            <p className="text-muted-foreground mb-6">
              While your competitors make customers wait hours for a response, your AI books them instantly
            </p>
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl inline-block">
              <p className="text-primary font-semibold">⚡ Result: 300% faster booking process</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
