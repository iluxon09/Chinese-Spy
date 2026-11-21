import Image from "next/image";

type TiltLogoProps = {
  className?: string;
  priority?: boolean;
};

export default function TiltLogo({ className = "", priority = false }: TiltLogoProps) {
  return (
    <Image
      src="/tilt-logo.svg"
      alt="TILT — Financial Universe"
      width={2048}
      height={682}
      priority={priority}
      className={`tilt-logo ${className}`.trim()}
    />
  );
}
