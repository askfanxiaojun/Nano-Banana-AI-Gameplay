/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateDecadeImage, generateSingleImage } from './services/geminiService';
import PolaroidCard from './components/PolaroidCard';
import { createAlbumPage } from './lib/albumUtils';
import Footer from './components/Footer';

const DECADES = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s'];
const MAGAZINES = ['TIME', 'Vogue', 'National Geographic', 'FORTUNE', 'The Economist', 'Forbes'];


// --- Mode Definitions ---
interface Mode {
  id: string;
  title: string;
  description: string;
  type: 'multi-image' | 'single-image';
  prompt?: string; // For single-image modes
  prompts?: Record<string, string>; // For multi-image modes
  albumTitle?: string; // For multi-image album download
  albumSubtitle?: string; // For multi-image album download
  previewClass: string; // Tailwind class for the card's background
  previewImage: string;
}

const MODES: Mode[] = [
    {
        id: 'time-travel',
        title: '拍立得的时空穿越',
        description: '生成你在不同年代的样子。',
        type: 'multi-image',
        prompts: DECADES.reduce((acc, decade) => {
            acc[decade] = `请将照片中的人物重塑为${decade}的风格。这包括那个年代的服装、发型、照片质感和整体美学。输出的图片必须是清晰、逼真的照片。`;
            return acc;
        }, {} as Record<string, string>),
        albumTitle: 'KAPI ACTION',
        albumSubtitle: '穿越时空的拍立得',
        previewClass: 'bg-gradient-to-br from-purple-500 to-indigo-600',
        previewImage: 'https://pic1.imgdb.cn/item/68bab34258cb8da5c880bda7.png',
    },
    {
        id: 'creative-magazine',
        title: '创意杂志风格',
        description: '生成六种不同风格的杂志封面。',
        type: 'multi-image',
        prompts: MAGAZINES.reduce((acc, magazine) => {
            acc[magazine] = `将图片修改为「${magazine}」杂志风格海报。要有中国式复古风格，高清质感。文字内容更大更突出，加强对比。文字只能为英文，不能出现中文。可以适当改变人物动作，增强画面张力，镜头拉近突出面部和衣物质感。`;
            return acc;
        }, {} as Record<string, string>),
        albumTitle: 'MAGAZINE STYLE',
        albumSubtitle: '创意杂志封面',
        previewClass: 'bg-gradient-to-br from-red-600 to-slate-900',
        previewImage: 'https://pic1.imgdb.cn/item/68bacb0158cb8da5c880dbbb.png',
    },
    {
        id: 'portrait-art',
        title: '白肖像艺术',
        description: '生成一张高分辨率的黑白艺术肖像。',
        type: 'single-image',
        prompt: `结合上传的图片，创作一张高分辨率的黑白肖像艺术作品，采用编辑类和艺术摄影风格。背景呈现柔和渐变效果，从中灰过渡到近乎纯白，营造出层次感与寂静氛围。细腻的胶片颗粒质感为画面增添了一种可触摸的、模拟摄影般的柔和质地，让人联想到经典的黑白摄影。画面右侧，一个基于上传图片的模糊却惊艳的面容从阴影中隐约浮现，并非传统的摆拍，而像是被捕捉于思索或呼吸之间的瞬间。他/她的脸部只露出一部分：也许是一个眼睛、一块颧骨，还有唇角的轮廓，唤起神秘、亲密与优雅之感。他/她的五官精致而深刻，散发出忧郁与诗意之美，却不显矫饰。一束温柔的定向光，柔和地漫射开来，轻抚他/她的面颊曲线，或在眼中闪现光点——这是画面的情感核心。其余部分以大量负空间占据，刻意保持简洁，使画面自由呼吸。画面中没有文字、没有标志——只有光影与情绪交织。整体氛围抽象却深具人性，仿佛一瞥即逝的目光，或半梦-半醒间的记忆：亲密、永恒、令人怅然的美。`,
        previewClass: 'bg-gradient-to-br from-neutral-400 to-neutral-700',
        previewImage: 'https://pic1.imgdb.cn/item/68bab4d558cb8da5c880cb36.png',
    },
    {
        id: 'knitted-doll',
        title: '可爱针织玩偶',
        description: '将你的照片变成一个可爱的针织玩偶。',
        type: 'single-image',
        prompt: `一张特写、构图专业的照片，展示一个手工钩织的毛线玩偶被双手轻柔地托着。玩偶造型圆润，是上传图片中人物的可爱Q版形象，色彩对比鲜明，细节丰富。持玩偶的双手自然、温柔，手指姿态清晰可见，皮肤质感与光影过渡自然，展现出温暖且真实的触感。背景轻微虚化，表现为室内环境，有温暖的木质桌面和从窗户洒入的自然光，营造出舒适、亲密的氛围。整体画面传达出精湛的工艺感与被珍视的温馨情绪。`,
        previewClass: 'bg-gradient-to-br from-pink-400 to-orange-400',
        previewImage: 'https://pic1.imgdb.cn/item/68bab49a58cb8da5c880c9a3.png',
    },
    {
        id: 'davinci-sketch',
        title: '达芬奇手绘稿',
        description: '将你的照片转换成达芬奇手绘稿风格。',
        type: 'single-image',
        prompt: `将这张图转换成达芬奇手绘稿风格。`,
        previewClass: 'bg-gradient-to-br from-amber-200 to-yellow-800',
        previewImage: 'https://pic1.imgdb.cn/item/68bab41258cb8da5c880c5e2.png',
    },
    {
        id: 'double-exposure',
        title: '双重曝光',
        description: '将你的肖像与城市剪影艺术性地融合。',
        type: 'single-image',
        prompt: `根据上传的图片中的人物主体生成图片：提取人物的形象，只需要展示人物侧脸，人物的侧脸与城市印象剪影轮廓进行多重曝光，黑白淡彩，完美重叠融合，人物之外的区域用纯白展示，整体情绪充满氛围感和艺术感，带有一定的胶片颗粒感，手签，胶片颗粒感，Ozanculha风，超现实主义，绝妙意境，高级感，杰作。`,
        previewClass: 'bg-gradient-to-br from-slate-700 to-cyan-200',
        previewImage: 'https://pic1.imgdb.cn/item/68bab43c58cb8da5c880c716.png',
    },
    {
        id: 'black-gold',
        title: '黑金摄影棚',
        description: '在纯黑背景下，用光线勾勒出你神秘的侧影轮廓。',
        type: 'single-image',
        prompt: `根据上传的图片中的人物主体生成图片：画面以纯黑为背景，采用侧面构图，用艺术感与神秘感兼具的风格，展现出人物形象的剪影。头发在侧前方光线的照射下，发丝隐隐约约。人物姿态安静，微微低头，脸部线条柔和流畅。画质细腻，呈现高对比度效果，画面色彩只有黑色背景和暖色调的剪影部分。侧前方的光线形成鲜明的明暗对比，塑造出立体的轮廓，镜头以平视角度与人物保持一定距离，捕捉这一剪影形象，带来沉静而引人遐想的视觉感受。`,
        previewClass: 'bg-gradient-to-br from-neutral-900 to-amber-500',
        previewImage: 'https://pic1.imgdb.cn/item/68bab42f58cb8da5c880c6b8.png',
    },
    {
        id: 'poster-selfie',
        title: '和自己的大屏合影',
        description: '生成一张你和自己复古海报的合影。',
        type: 'single-image',
        prompt: `识别输入照片中的人物，并根据其外观创建一张复古风格的海报，将其贴在墙上。不要改变人物在输入照片中的姿势；而是将他们站立或坐在海报旁边，看起来像是用海报拍照。海报应带有强烈的怀旧氛围，包含胶片颗粒、微妙的暗角效果和磨损的纸张纹理。海报中的人物应显示为侧面或正面，部分被抽象几何形状覆盖，以增加现代拼贴美学。海报的标题应使用粗体衬线或无衬线字体，以不规则或略微偏移的布局排列。为增强真实感，可包含小图形细节，如点状元素、手绘笔触或粗糙的笔触痕迹。与海报合影的人物应保持与输入照片相同的姿势和构图，不改变其面部特征或表情。墙壁上还应展示其他著名电影海报。`,
        previewClass: 'bg-gradient-to-br from-slate-800 to-amber-600',
        previewImage: 'https://pic1.imgdb.cn/item/68bab97a58cb8da5c880d305.png',
    },
    {
        id: 'showa-idol',
        title: '昭和时代写真画报',
        description: '变身为昭和时代的杂志封面偶像。',
        type: 'single-image',
        prompt: `识别图中的人物，根据人物生成图片，风格按照昭和时代日本杂志封面风格，复古铜版画偶像摄影，人物需要穿着彩色服装，俏皮怀旧的气氛，1970 年代 1980 年代复古胶片色调，柔和光线，略微过曝，复古照片纹理，印刷杂志布局，日文，可爱道具，花朵，玩具，欢快温暖`,
        previewClass: 'bg-gradient-to-br from-pink-300 to-sky-400',
        previewImage: 'https://pic1.imgdb.cn/item/68bab99b58cb8da5c880d311.png',
    }
];


// Pre-defined positions for a scattered look on desktop
const POSITIONS = [
    { top: '5%', left: '10%', rotate: -8 },
    { top: '15%', left: '60%', rotate: 5 },
    { top: '45%', left: '5%', rotate: 3 },
    { top: '2%', left: '35%', rotate: 10 },
    { top: '40%', left: '70%', rotate: -12 },
    { top: '50%', left: '38%', rotate: -3 },
];

type ImageStatus = 'pending' | 'done' | 'error';
interface GeneratedImage {
    status: ImageStatus;
    url?: string;
    error?: string;
}

const primaryButtonClasses = "font-permanent-marker text-xl text-center text-black bg-yellow-400 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:-rotate-2 hover:bg-yellow-300 shadow-[2px_2px_0px_2px_rgba(0,0,0,0.2)]";
const secondaryButtonClasses = "font-permanent-marker text-xl text-center text-white bg-white/10 backdrop-blur-sm border-2 border-white/80 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:rotate-2 hover:bg-white hover:text-black";

const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, [matches, query]);
    return matches;
};

function App() {
    const [appState, setAppState] = useState<'selection' | 'uploader' | 'generating' | 'results'>('selection');
    const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<Record<string, GeneratedImage>>({});
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const dragAreaRef = useRef<HTMLDivElement>(null);
    const isMobile = useMediaQuery('(max-width: 768px)');

    const handleModeSelect = (mode: Mode) => {
        setSelectedMode(mode);
        setAppState('uploader');
    };

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setGeneratedImages({}); // Clear previous results
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateClick = async () => {
        if (!uploadedImage || !selectedMode) return;
    
        setAppState('generating');
        
        if (selectedMode.type === 'single-image' && selectedMode.prompt) {
            setGeneratedImages({ [selectedMode.id]: { status: 'pending' } });
            try {
                const resultUrl = await generateSingleImage(uploadedImage, selectedMode.prompt);
                setGeneratedImages({ [selectedMode.id]: { status: 'done', url: resultUrl } });
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                setGeneratedImages({ [selectedMode.id]: { status: 'error', error: errorMessage } });
                console.error(`Failed to generate image for ${selectedMode.title}:`, err);
            }
        } else if (selectedMode.type === 'multi-image' && selectedMode.prompts) {
            const imageKeys = Object.keys(selectedMode.prompts);
            const initialImages: Record<string, GeneratedImage> = {};
            imageKeys.forEach(key => {
                initialImages[key] = { status: 'pending' };
            });
            setGeneratedImages(initialImages);
    
            const concurrencyLimit = 2;
            const keysQueue = [...imageKeys];
    
            const processKey = async (key: string) => {
                try {
                    const prompt = selectedMode.prompts![key];
                    const resultUrl = await generateDecadeImage(uploadedImage, prompt);
                    setGeneratedImages(prev => ({
                        ...prev,
                        [key]: { status: 'done', url: resultUrl },
                    }));
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                    setGeneratedImages(prev => ({
                        ...prev,
                        [key]: { status: 'error', error: errorMessage },
                    }));
                    console.error(`Failed to generate image for ${key}:`, err);
                }
            };
    
            const workers = Array(concurrencyLimit).fill(null).map(async () => {
                while (keysQueue.length > 0) {
                    const key = keysQueue.shift();
                    if (key) {
                        await processKey(key);
                    }
                }
            });
    
            await Promise.all(workers);
        }
        
        setAppState('results');
    };
    
    const handleRegenerate = async (key: string) => {
        if (!uploadedImage || !selectedMode) return;
        if (generatedImages[key]?.status === 'pending') return;
    
        console.log(`Regenerating image for ${key}...`);
        setGeneratedImages(prev => ({ ...prev, [key]: { status: 'pending' } }));
    
        try {
            let resultUrl = '';
            if (selectedMode.type === 'single-image' && selectedMode.prompt) {
                resultUrl = await generateSingleImage(uploadedImage, selectedMode.prompt);
            } else if (selectedMode.type === 'multi-image' && selectedMode.prompts?.[key]) {
                const prompt = selectedMode.prompts[key];
                resultUrl = await generateDecadeImage(uploadedImage, prompt);
            } else {
                throw new Error("Invalid mode configuration for regeneration.");
            }
            setGeneratedImages(prev => ({ ...prev, [key]: { status: 'done', url: resultUrl } }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setGeneratedImages(prev => ({ ...prev, [key]: { status: 'error', error: errorMessage } }));
            console.error(`Failed to regenerate image for ${key}:`, err);
        }
    };
    
    const handleStartOver = () => {
        setUploadedImage(null);
        setGeneratedImages({});
        setSelectedMode(null);
        setAppState('selection');
    };

    const handleChangeImage = () => {
        setUploadedImage(null);
        setGeneratedImages({});
    }

    const handleDownloadIndividualImage = (key: string) => {
        const image = generatedImages[key];
        if (image?.status === 'done' && image.url) {
            const link = document.createElement('a');
            link.href = image.url;
            link.download = `creative-output-${key}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadAlbum = async () => {
        if (!selectedMode?.prompts) return;
        setIsDownloading(true);
        try {
            const imageData = Object.entries(generatedImages)
                .filter(([, image]) => image.status === 'done' && image.url)
                .reduce((acc, [key, image]) => {
                    acc[key] = image!.url!;
                    return acc;
                }, {} as Record<string, string>);

            if (Object.keys(imageData).length < Object.keys(selectedMode.prompts).length) {
                alert("请等待所有图片生成完毕后再下载相册。");
                setIsDownloading(false);
                return;
            }
            const albumDataUrl = await createAlbumPage(
                imageData,
                selectedMode.albumTitle || 'My Album',
                selectedMode.albumSubtitle || 'Creative Generations'
            );
            // Fix: Declare the 'link' const for downloading the album.
            const link = document.createElement('a');
            link.href = albumDataUrl;
            link.download = 'creative-album.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to create or download album:", error);
            alert("抱歉，创建相册时出错。请重试。");
        } finally {
            setIsDownloading(false);
        }
    };

    const renderContent = () => {
        switch (appState) {
            case 'selection':
                return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                        <h1 className="text-6xl md:text-8xl font-caveat font-bold text-neutral-100">AI 创意工坊</h1>
                        <p className="font-permanent-marker text-neutral-300 mt-2 text-xl tracking-wide">选择一个玩法，释放你的想象力。</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12 max-w-6xl">
                            {MODES.map((mode, index) => (
                                <motion.div
                                    key={mode.id}
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1, type: 'spring', stiffness: 100 }}
                                    whileHover={{ y: -5 }}
                                    className="rounded-lg shadow-lg cursor-pointer text-left h-64 overflow-hidden relative group"
                                    onClick={() => handleModeSelect(mode)}
                                >
                                    <img 
                                        src={mode.previewImage} 
                                        alt={mode.title} 
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                                    <div className="relative p-6 flex flex-col justify-between h-full">
                                        <div>
                                            <h2 className="text-3xl font-permanent-marker bg-gradient-to-br from-white to-neutral-300 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{mode.title}</h2>
                                            <p className="text-white/90 mt-2 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">{mode.description}</p>
                                        </div>
                                        <span className="text-white font-bold self-end text-2xl transition-transform duration-300 group-hover:translate-x-2 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">→</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                );

            case 'uploader':
                return (
                    <div className="w-full flex flex-col items-center">
                        <div className="relative w-full max-w-lg text-center">
                            <button onClick={handleStartOver} className="absolute top-0 left-0 text-white hover:text-yellow-400 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8a5 5 0 015 5v1" />
                                </svg>
                            </button>
                            <h2 className="text-4xl font-caveat text-white">{selectedMode?.title}</h2>
                        </div>
                        <div className="mt-8 flex flex-col items-center gap-6">
                            {!uploadedImage ? (
                                <>
                                    <label htmlFor="file-upload" className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                                        <PolaroidCard caption="点击上传照片" status="done" />
                                    </label>
                                    <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                                </>
                            ) : (
                                <>
                                    <PolaroidCard imageUrl={uploadedImage} caption="你的照片" status="done" />
                                    <div className="flex items-center gap-4 mt-4">
                                        <button onClick={handleChangeImage} className={secondaryButtonClasses}>换张照片</button>
                                        <button onClick={handleGenerateClick} className={primaryButtonClasses}>开始生成</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );

            case 'generating':
            case 'results':
                const singleImageKey = selectedMode ? selectedMode.id : '';
                const multiImageKeys = selectedMode?.prompts ? Object.keys(selectedMode.prompts) : [];
                
                return (
                    <>
                        {selectedMode?.type === 'single-image' && (
                            <div className="flex justify-center items-center flex-1 w-full">
                                <PolaroidCard
                                    key={singleImageKey}
                                    caption={selectedMode.title}
                                    status={generatedImages[singleImageKey]?.status || 'pending'}
                                    imageUrl={generatedImages[singleImageKey]?.url}
                                    error={generatedImages[singleImageKey]?.error}
                                    onShake={() => handleRegenerate(singleImageKey)}
                                    onDownload={() => handleDownloadIndividualImage(singleImageKey)}
                                    isMobile={isMobile}
                                />
                            </div>
                        )}
                        {selectedMode?.type === 'multi-image' && (
                             isMobile ? (
                                <div className="w-full max-w-sm flex-1 overflow-y-auto mt-4 space-y-8 p-4">
                                    {multiImageKeys.map((key) => (
                                        <div key={key} className="flex justify-center">
                                            <PolaroidCard
                                                caption={key}
                                                status={generatedImages[key]?.status || 'pending'}
                                                imageUrl={generatedImages[key]?.url}
                                                error={generatedImages[key]?.error}
                                                onShake={() => handleRegenerate(key)}
                                                onDownload={() => handleDownloadIndividualImage(key)}
                                                isMobile={isMobile}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div ref={dragAreaRef} className="relative w-full max-w-5xl h-[600px] mt-4">
                                    {multiImageKeys.map((key, index) => {
                                        const { top, left, rotate } = POSITIONS[index % POSITIONS.length];
                                        return (
                                            <motion.div
                                                key={key}
                                                className="absolute cursor-grab active:cursor-grabbing"
                                                style={{ top, left }}
                                                initial={{ opacity: 0, scale: 0.5, y: 100, rotate: 0 }}
                                                animate={{ opacity: 1, scale: 1, y: 0, rotate: `${rotate}deg` }}
                                                transition={{ type: 'spring', stiffness: 100, damping: 20, delay: index * 0.15 }}
                                            >
                                                <PolaroidCard
                                                    dragConstraintsRef={dragAreaRef}
                                                    caption={key}
                                                    status={generatedImages[key]?.status || 'pending'}
                                                    imageUrl={generatedImages[key]?.url}
                                                    error={generatedImages[key]?.error}
                                                    onShake={() => handleRegenerate(key)}
                                                    onDownload={() => handleDownloadIndividualImage(key)}
                                                    isMobile={isMobile}
                                                />
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                        <div className="h-20 mt-4 flex items-center justify-center">
                            {appState === 'results' && (
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    {selectedMode?.type === 'multi-image' && (
                                        <button 
                                            onClick={handleDownloadAlbum} 
                                            disabled={isDownloading} 
                                            className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {isDownloading ? '正在创建相册...' : '下载相册'}
                                        </button>
                                    )}
                                    <button onClick={handleStartOver} className={secondaryButtonClasses}>
                                        换个玩法
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                );

            default: return null;
        }
    }

    return (
        <main className="bg-black text-neutral-200 min-h-screen w-full flex flex-col items-center justify-center p-4 pb-24 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.05]"></div>
            <div className="z-10 flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
                {renderContent()}
            </div>
            <Footer />
        </main>
    );
}

export default App;