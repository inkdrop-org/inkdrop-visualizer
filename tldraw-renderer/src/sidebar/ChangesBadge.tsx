interface ChangesBadgeProps {
    action: string,
    number: number
}
const ChangesBadge = ({
    action, number
}: ChangesBadgeProps) => {
    return (
        <div
            style={{
                backgroundColor: action === "create" ? "#37BB65" :
                    action === "delete" ? "#E22134" :
                        action === "update" ? "#F2960D" : "#797181",
                fontSize: "12px",
                minWidth: number > 999 ? "max-content" : "1.5rem",
            }}
            className='mr-1 rounded-full h-4 text-center leading-[15px]'>
            {number}
        </div>
    )
}

export default ChangesBadge;