import React from 'react';

export const LogoScroll = () => {
  const logos = [
    {
      src: "https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px.png",
      alt: "Lender Logo 1",
      height: "100px" // TD logo height - our reference
    },
    {
      src: "https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-2.png",
      alt: "Lender Logo 2",
      height: "180px" // Slightly larger to match visual weight
    },
    {
      src: "https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-3.png",
      alt: "Lender Logo 3",
      height: "220px"
    },
    {
      src: "https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-4.png",
      alt: "Lender Logo 4",
      height: "220px"
    },
    {
      src: "https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-7.png",
      alt: "Lender Logo 5",
      height: "220px"
    },
    {
      src: "https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-8.png",
      alt: "Lender Logo 6",
      height: "220px"
    },
    {
      src: "https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-9.png",
      alt: "Lender Logo 7",
      height: "220px"
    },
    {
      src: "https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-10.png",
      alt: "Lender Logo 8",
      height: "220px"
    },
    {
      src: "https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-11.png",
      alt: "Lender Logo 9",
      height: "200px"
    },
    {
      src: "https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-13.png",
      alt: "Lender Logo 10",
      height: "200px"
    },
    {
      src: "https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-14.png",
      alt: "Lender Logo 11",
      height: "220px"
    },
    {
      src: "https://ontarioautoapprovals.ca/wp-content/uploads/2024/11/Untitled-1024-x-1023-px-15.png",
      alt: "Lender Logo 12",
      height: "200px"
    }
  ];

  return (
    <section className="relative bg-white">
      {/* Title and Description */}
      <div className="text-center py-12">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Our Trusted Lending Partners
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto px-4">
          We've partnered with Canada's leading financial institutions to provide you with competitive rates and flexible terms. Our extensive network ensures you get the best financing solution for your needs.
        </p>
      </div>

      {/* Logo Scroll Section */}
      <div className="h-[144px] md:h-[180px] overflow-hidden relative shadow-[0_-8px_12px_-3px_rgba(0,0,0,0.08),0_8px_12px_-3px_rgba(0,0,0,0.08)]">
        {/* Gradient Overlay - Left */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
        
        {/* Gradient Overlay - Right */}
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />
        
        {/* Scrolling Container */}
        <div className="flex items-center h-full py-6 md:py-8">
          {/* First set of logos */}
          <div className="flex animate-scroll gap-16 md:gap-20 whitespace-nowrap">
            {logos.map((logo) => (
              <div
                key={logo.alt}
                className="flex items-center justify-center w-[240px] md:w-[300px] px-4 md:px-6"
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  style={{ height: logo.height }}
                  className="w-auto object-contain scale-75 md:scale-100"
                />
              </div>
            ))}
          </div>
          
          {/* Duplicate set for seamless loop */}
          <div className="flex animate-scroll gap-16 md:gap-20 whitespace-nowrap">
            {logos.map((logo) => (
              <div
                key={`${logo.alt}-duplicate`}
                className="flex items-center justify-center w-[240px] md:w-[300px] px-4 md:px-6"
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  style={{ height: logo.height }}
                  className="w-auto object-contain scale-75 md:scale-100"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};