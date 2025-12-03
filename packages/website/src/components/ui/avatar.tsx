import * as React from "react"
import { cn } from "~/lib/utils"

const AvatarContext = React.createContext<{
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
}>({ imageLoaded: false, setImageLoaded: () => {} });

function Avatar({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const [imageLoaded, setImageLoaded] = React.useState(false);

  return (
    <AvatarContext.Provider value={{ imageLoaded, setImageLoaded }}>
      <div
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AvatarContext.Provider>
  )
}

function AvatarImage({
  className,
  src,
  ...props
}: React.ComponentProps<"img">) {
  const { setImageLoaded } = React.useContext(AvatarContext);

  React.useEffect(() => {
    if (!src) {
      setImageLoaded(false);
      return;
    }

    const img = new Image();
    img.src = src;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(false);

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, setImageLoaded]);

  if (!src) return null;

  return (
    <img
      src={src}
      className={cn("aspect-square h-full w-full object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { imageLoaded } = React.useContext(AvatarContext);

  if (imageLoaded) return null;

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }