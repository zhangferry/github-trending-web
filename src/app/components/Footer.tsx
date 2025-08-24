import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-6 mt-auto border-t border-[#30363d] bg-[#161b22]">
      <div className="container mx-auto px-4 text-center text-[#8b949e]">
        <p>
          Copyright © {currentYear} |{' '}
          <a
            href="https://github.com/zhangferry/github-trending-web"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#58a6ff] hover:text-[#79c0ff] hover:underline transition-colors"
          >
            Github Trending
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
