import Image from "next/image";

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  subtitleClassName?: string;
}

export default function AuthHeader({
  title,
  subtitle,
  subtitleClassName = "mt-1",
}: AuthHeaderProps) {
  return (
    <div className="text-center mb-8">
      <Image
        src="/logo.avif"
        alt="Yapp logo"
        width={64}
        height={64}
        priority
        className="mx-auto mb-4 rounded-2xl object-cover"
      />
      <h1
        className="text-2xl font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className={`text-sm ${subtitleClassName}`}
          style={{ color: "var(--text-secondary)" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
