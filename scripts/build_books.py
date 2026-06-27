#!/usr/bin/env python3
"""Build all books from books/ folder into books_data.js"""
import argparse,glob,json,os,re,sys,xml.etree.ElementTree as ET
from collections import Counter
FB_NS="http://www.gribuser.ru/xml/fictionbook/2.0"; NS={"fb":FB_NS}
LR={"A1":(0,1000),"A2":(1000,3000),"B1":(3000,8000),"B2":(8000,15000),"C1":(15000,30000),"C2":(30000,float("inf"))}
def gt(el):
    if el is None: return ""
    return "".join(t for t in el.itertext() if t and t.strip()).strip()
def ct(t):
    if not t: return ""
    t=re.sub(r"[\r\n\t]+"," ",t)
    return re.sub(r" {2,}"," ",t).strip()
def sn(s):
    s=re.sub(r"[^\w\s\-\u0400-\u04FF]","",s)
    return re.sub(r"\s+","_",s.strip().lower())or"book"
def lj(p):
    with open(p,"r",encoding="utf-8")as f:return json.load(f)
def pf(path):
    tree=ET.parse(path);root=tree.getroot();ti=root.find("fb:description/fb:title-info",NS)
    bt=ti.find("fb:book-title",NS)if ti is not None else None
    title=bt.text.strip()if bt is not None and bt.text else"Unknown"
    au=ti.find("fb:author",NS)if ti is not None else None;name=""
    if au is not None:
        fn=au.find("fb:first-name",NS);ln=au.find("fb:last-name",NS)
        p=[]
        if fn is not None and fn.text:p.append(fn.text.strip())
        if ln is not None and ln.text:p.append(ln.text.strip())
        name=" ".join(p)
    body=root.find("fb:body",NS);chapters=[]
    if body is not None:
        # Recursively extract all sections that contain text
        all_secs = body.findall(".//fb:section", NS)
        seen_texts = set()
        for s in all_secs:
            # Check if this section has actual text content
            pars = s.findall(".//fb:p", NS)
            poems = s.findall(".//fb:poem", NS)
            has_text = len(pars) > 0 or len(poems) > 0
            if not has_text: continue
            tel=s.find("fb:title",NS)
            cht=gt(tel)if tel is not None else""
            if not cht:cht=f"Chapter {len(chapters)+1}"
            # Get all text (from p and poem elements)
            parts = []
            for p in pars:
                t = gt(p)
                if t: parts.append(t)
            for poem in poems:
                # Extract text from poem elements
                sts = poem.findall(".//fb:stanza", NS)
                for st in sts:
                    vs = st.findall("fb:v", NS)
                    for v in vs:
                        t = gt(v)
                        if t: parts.append(t)
                # Also direct v in poem
                vs = poem.findall("fb:v", NS)
                for v in vs:
                    t = gt(v)
                    if t and t not in parts: parts.append(t)
            full=ct(" ".join(parts))
            # Deduplicate by text content
            text_key = full[:100]
            if full and text_key not in seen_texts:
                seen_texts.add(text_key)
                chapters.append({"title":cht,"text":full})
    return{"title":title,"author":name,"chapters":chapters}
def brd(en_ru):
    ru_en={}
    for en,ru in en_ru.items():
        if not ru:continue
        p=ru.split(",")[0].strip().lower()
        ru_en.setdefault(p,[]).append(en)
    return ru_en
def bfr(freq):
    sw=sorted(freq.items(),key=lambda x:x[1],reverse=True)
    return{w:i for i,(w,_)in enumerate(sw)}
def sww(text,word_ranks,rev_dict,lvl,pct):
    wr=word_ranks;rev=rev_dict
    toks=re.findall(r"[\u0400-\u04FF\u0451\u0401a-zA-Z]+",text.lower())
    total=len(toks)
    if total==0:return[]
    tc=Counter(toks);target=max(1,int(total*pct/100))
    cand,sp=[],set()
    for rw,cnt in tc.most_common():
        if rw not in rev:continue
        for ew in rev[rw]:
            if ew not in wr:continue
            pk=(ew,rw)
            if pk in sp:continue
            sp.add(pk)
            cand.append({"en":ew,"ru":rw,"rank":wr[ew],"count":cnt})
    if not cand:return[]
    f=[]
    target_count = 4
    for attempt_level in [lvl,"B2","B1","A2","A1"]:
        lo,hi=LR.get(attempt_level,(0,float("inf")))
        level_cands=[c for c in cand if lo<=c["rank"]<hi and c not in f]
        for lc in level_cands:
            if lc not in f:
                f.append(lc)
        if len(f) >= target_count:
            break
    if not f:return[]
    f.sort(key=lambda c:(-c["count"],c["rank"]))
    sel,swr,rep=[],set(),0
    for c in f:
        if c["en"]in swr:continue
        swr.add(c["en"])
        sel.append({"en":c["en"],"ru":c["ru"]})
        rep+=c["count"]
        if rep>=target:break
    def fo(p):
        for i,t in enumerate(toks):
            if t==p["ru"]:return i
        return len(toks)
    sel.sort(key=fo)
    return sel
def sp(text):
    text=text.strip()
    parts=re.split(r"\n{2,}",text)
    if len(parts)>1:return[p.strip()for p in parts if p.strip()]
    sents=re.split(r"(?<=[.!?])\s+(?=[\u0410-\u042fA-Z])",text)
    paras=[]
    for i in range(0,len(sents),4):paras.append(" ".join(sents[i:i+4]))
    return[p for p in paras if p.strip()]
def fw(text,words):
    tl=text.lower();found,seen=[],set()
    import re as re_mod
    for w in words:
        rl=w["ru"].lower()
        # Use word boundary regex to avoid matching parts of words
        pattern=r"(^|[^\u0400-\u04FF\u0451\u0401a-zA-Z])"+re_mod.escape(rl)+r"([^\u0400-\u04FF\u0451\u0401a-zA-Z]|$)"
        if re_mod.search(pattern,tl,re_mod.IGNORECASE) and(w["en"],w["ru"])not in seen:
            seen.add((w["en"],w["ru"]))
            found.append({"en":w["en"],"ru":w["ru"]})
    return found
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--level","-l",default="A2",choices=["A1","A2","B1","B2","C1","C2"])
    ap.add_argument("--percent","-p",type=float,default=5.0)
    ap.add_argument("--freq",default=None);ap.add_argument("--dict",default=None)
    args=ap.parse_args()
    root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    freq_path=args.freq or os.path.join(root,"data","word_frequencies.json")
    dict_path=args.dict or os.path.join(root,"data","en_ru_dict.json")
    print(f"Loading freq: {freq_path}");freq=lj(freq_path)
    print(f"Loading dict: {dict_path}");dic=lj(dict_path)
    print(f"Level: {args.level}, %: {args.percent}")
    fb2_files=glob.glob(os.path.join(root,"books","*.fb2"))
    if not fb2_files:print("No .fb2 files");sys.exit(1)
    all_books=[]
    # Precompute frequency ranks and reverse dict once
    print("Computing frequency ranks...")
    word_ranks = bfr(freq)
    rev_dict = brd(dic)
    print(f"Ranks: {len(word_ranks)}, Reverse dict: {len(rev_dict)}")
    
    for fpath in fb2_files:
        fname=os.path.basename(fpath)
        print(f"\nProcessing: {fname}")
        book=pf(fpath)
        print(f"  Title: {book['title']}, Chapters: {len(book['chapters'])}")
        bchs=[]
        for ci,ch in enumerate(book["chapters"]):
            if ci>0 and ci%20==0: print(f"  ... chapter {ci}/{len(book['chapters'])}")
            print(f"  Ch{ci+1}: {ch['title'][:30]} ({len(ch['text']):,})")
            words=sww(ch["text"],word_ranks,rev_dict,args.level,args.percent)
            print(f"    Words: {[w['en']for w in words]}")
            paras_raw=sp(ch["text"])
            paras=[]
            for pt in paras_raw:
                fw2=fw(pt,words)
                paras.append({"ru":pt,"words":fw2})
            bchs.append({"title":ch["title"],"paragraphs":paras})
        all_books.append({"id":sn(book["title"]),"title":book["title"],"author":book["author"],"chapters":bchs})
    js_path=os.path.join(root,"data","books","books_data.js")
    out="// Auto-generated by build_books.py\n"
    out+="// Level: "+args.level+", Percent: "+str(args.percent)+"%\n"
    out+="const BOOKS_DATA = "+json.dumps(all_books,ensure_ascii=False,indent=2)+";\n"
    with open(js_path,"w",encoding="utf-8")as f:f.write(out)
    print(f"\nSaved: {js_path}")
    print(f"Books: {len(all_books)}")
    for b in all_books:print(f"  {b['title']} ({len(b['chapters'])} ch)")
if __name__=="__main__":main()
