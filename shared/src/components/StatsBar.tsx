import coffeePng from "../assets/coffeeDonation.png";

interface Props {
  filteredCount: number;
  total: number;
}

export function StatsBar({ filteredCount, total }: Props) {
  return (
    <div className="stats-bar">
      <a
        className="donate-btn"
        href="https://paypal.me/jzsix"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="donate-tooltip">Buy me a coffee!</span>
        <img src={coffeePng} alt="Buy me a coffee" />
      </a>
      <span>
        Showing <span className="hl">{filteredCount}</span> of <span className="hl">{total}</span> games
      </span>
      <span className="copyright">&copy; {new Date().getFullYear()} JZ6</span>
    </div>
  );
}
