interface Resource {
    title: string;
    link: string;
}

export function Resources() {
    const resources: Resource[] = [
        { title: "算法笔记分享", link: "https://example.com/note" },
        { title: "课后习题答案", link: "https://example.com/answer" },
        { title: "推荐阅读资料", link: "https://example.com/resource" },
    ];

    return (
        <div className="bg-white shadow p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">🔗 相关资源</h2>
            <ul className="list-disc list-inside space-y-2 text-blue-600">
                {resources.map((r, idx) => (
                    <li key={idx}>
                        <a
                            href={r.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                        >
                            {r.title}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
 